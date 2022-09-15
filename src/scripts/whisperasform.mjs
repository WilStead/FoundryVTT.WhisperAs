export class WhisperAsFormApplication extends FormApplication {
    constructor(currentMessage) {
        super();
        this.currentMessage = currentMessage;
    }

    static get defaultOptions() {
        const defaults = super.defaultOptions;

        const overrides = {
            height: 'auto',
            id: 'whisper-as',
            template: 'modules/whisper-as/templates/whisperas.hbs',
            title: game.i18n.localize('whisper-as.title'),
        };

        return foundry.utils.mergeObject(defaults, overrides);
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.on('change', 'input[name="whisperIC"]', html, this._selectSpeaker);
        html.on('change', '#whisperAs', html, this._switchToken);
    }

    getData(options) {
        const defaultToCharacter = game.settings.get('whisper-as', 'defaultToCharacter');
        const activePlayersOnly = game.settings.get('whisper-as', 'activePlayersOnly');
        const players = activePlayersOnly
            ? game.users.filter(player => player.active)
            : game.users;

        let whisperOOC = true;
        let whisperIC = false;
        if (defaultToCharacter) {
            whisperOOC = false;
            whisperIC = true;
        }
        let whisperSpeakerID = canvas.tokens.controlled[0] !== undefined
            ? canvas.tokens.controlled[0].actor.id
            : game.user.character;
        let whisperer = game.actors.get(whisperSpeakerID);
        
        const currentSceneTokensOnly = game.settings.get('whisper-as', 'currentSceneTokensOnly');
        const characters = currentSceneTokensOnly
            ? game.actors.filter(actor => actor.scene && actor.scene.isView)
            : game.actors;
        
        const whisperToChoices = [];
        const gm = game.i18n.localize('whisper-as.gm');
        const whisperToGmChoice = {
            id: 'gm',
            name: gm,
            title: gm,
        };
        const targets = Array.from(game.user.targets);
        let anyChecked = false;
        players.forEach(player => {
            if (player.id === game.user.id
                || player.name == gm) {
                return;
            }

            if (game.user.isGM
                && whisperer
                && whisperer.ownership[player.id] !== undefined
                && whisperer.ownership[player.id] > 2) {
                whisperer = undefined;
                whisperSpeakerID = game.user.character;
            }

            const choice = {
                id: player.id,
                name: player.name,
                title: '',
                checked: false,
            };

            if (targets.length > 0) {
                for (let i = 0; i < targets.length; i++) {
                    if (game.actors.get(targets[i].actor._id).ownership[player.id] !== undefined
                        && game.actors.get(targets[i].actor._id).ownership[player.id] > 2) {
                        choice.checked = true;
                        anyChecked = true;
                    }
                }
            }
            if (!choice.checked && game.user.isGM) {
                for (let i = 0; i < canvas.tokens.controlled.length; i++) {
                    if (game.actors.get(canvas.tokens.controlled[i].actor.id).ownership[player.id] !== undefined
                        && game.actors.get(canvas.tokens.controlled[i].actor.id).ownership[player.id] > 2) {
                        choice.checked = true;
                        anyChecked = true;
                    }
                }
            }

            if (player.role == 4) {
                choice.title = gm;
            } else if (player.role == 3) {
                choice.title = gm;
            } else {
                characters.forEach(character => {
                    if (character.ownership[`${player.id}`] > 2) {
                        choice.title += " [" + character.name.replace(/'/g, '`') + "] ";
                    }
                });
            }

            whisperToChoices.push(choice);
        });
        if (!anyChecked && !game.user.isGM) {
            whisperToGmChoice.checked = true;
        }
        whisperToChoices.unshift(whisperToGmChoice);
        
        const whisperAsChoices = [];
        let alias;
        let found;
        characters.forEach(character => {
            if (character.permission < 3) {
                return;
            }
            const index = whisperAsChoices.findIndex(c => c.name == character.name);
            if (index != -1) {
                return;
            }
            if (game.user.isGM) {
                let isPlayer = false;
                players.forEach(player => {
                    if (player.id !== game.user.id
                        && !player.isGM
                        && character.ownership[player.id] !== undefined
                        && character.ownership[player.id] > 2) {
                            isPlayer = true;
                    }
                });
                if (isPlayer) {
                    return;
                }
            }
            let selected = false;
            if (!found
                && character.id == whisperSpeakerID) {
                selected = true;
                alias = character.name;
                found = true;
            }
            whisperAsChoices.push({
                id: character.id,
                name: character.name,
                selected,
            });
        });
        game.scenes.current.tokens.forEach(token => {
            if (!token.actor || token.actor.permission < 3) {
                return;
            }
            if (game.user.isGM) {
                let isPlayer = false;
                players.forEach(player => {
                    if (player.id !== game.user.id
                        && token.actor.ownership[player.id] !== undefined
                        && token.actor.ownership[player.id] > 2) {
                            isPlayer = true;
                    }
                });
                if (isPlayer) {
                    return;
                }
            }

            if (!token.actorLink
                && token.name != token.actor.name
                && whisperAsChoices.findIndex(character => character.name != token.name) == -1) {
                let selected = false;
                if (!found
                    && token.actor.id == whisperSpeakerID) {
                    selected = true;
                    found = true;
                }
                whisperAsChoices.unshift({
                    id: token.actor.id,
                    name: token.name,
                    alias: token.name,
                    selected,
                });
            } else if (!currentSceneTokensOnly) {
                const index = whisperAsChoices.findIndex(character => character.name == token.name);
                if (index != -1) {
                    const removed = whisperAsChoices.splice(index, 1);
                    whisperAsChoices.unshift(...removed);
                } else {
                    let selected = false;
                    if (token.actor.id == whisperSpeakerID) {
                        selected = true;
                        alias = token.actor.name;
                        found = true;
                    }
                    whisperAsChoices.unshift({
                        id: token.actor.id,
                        name: token.actor.name,
                        selected,
                    });
                }
            }
        });
        if (!found) {
            whisperOOC = true;
            whisperIC = false;
        }
        
        const gmOnlyAlias = game.settings.get('whisper-as', 'gmOnlyAlias');
        const showAlias = game.user.isGM || (!gmOnlyAlias && game.user.isTrusted);
        return {
            whisperOOC,
            whisperIC,
            whisperICEnabled: whisperAsChoices.length > 0,
            whisperToChoices,
            whisperAsChoices,
            showAlias,
            alias: showAlias
                ? alias
                : undefined,
            currentMessage: this.currentMessage,
        };
    }

    _selectSpeaker(event) {
        const alias = event.data.find("#speakerAlias");
        if (alias) {
            const isIC = event.data.find("#whisperIC:checked").val();
            alias.val(isIC == 'true'
                ? event.data.find("#whisperAs option:selected").text()
                : '');
        }
    }

    _switchToken(event) {
        event.data.find("#whisperIC").prop('checked', true);
        const alias = event.data.find("#speakerAlias");
        if (alias) {
            alias.val(event.data.find("#whisperAs option:selected").text());
        }
    }

    async _updateObject(event, formData) {
        const whisperID = new Array();
        let integer = 0;
        if (formData.gm) {
            const gmIds = game.users.filter(u => u.isGM).map(u => u._id);
            whisperID.push(...gmIds);
            integer += gmIds.length;
        }

        const activePlayersOnly = game.settings.get('whisper-as', 'activePlayersOnly');
        const players = activePlayersOnly
            ? game.users.filter(player => player.active)
            : game.users;
            
        players.forEach(player => {
            if (formData[player.id]) {
                whisperID[integer] = player.id;
                integer = integer + 1;
            }
        });

        const warnIfNoRecipients = game.settings.get('whisper-as', 'warnIfNoRecipients');
        if (whisperID.length < 1 && warnIfNoRecipients) {
            new Dialog({
                title: game.i18n.localize('whisper-as.noRecipientsTitle'),
                content: game.i18n.localize('whisper-as.noRecipientsContent'),
                buttons: {
                    button1: {
                        label: "Yes",
                        callback: () => {
                            ChatMessage.create({
                                user : game.user.id,
                                speaker: formData.whisperIC
                                    ? {actor: formData.whisperAs, alias: formData.speakerAlias}
                                    : {alias: formData.speakerAlias},
                                content: formData.whisperText,
                            });
                        },
                        icon: '<i class="fas fa-check"></i>'
                    },
                    button2: {
                        label: "No",
                        icon: '<i class="fas fa-times"></i>'
                    }
                }
            }).render(true);
            ui.notifications.warn(game.i18n.localize('whisper-as.noTargetWarning'));
            return;
        } else {
            ChatMessage.create({
                user : game.user.id,
                speaker: formData.whisperIC
                    ? {actor: formData.whisperAs, alias: formData.speakerAlias}
                    : {alias: formData.speakerAlias},
                content: formData.whisperText,
                whisper : whisperID,
            });
        }
        $("#chat-message").val('');
    }
}