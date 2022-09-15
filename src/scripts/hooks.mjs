import { WhisperAsFormApplication } from './whisperasform.mjs';

Hooks.on('init', ()=> {
    game.settings.register('whisper-as', 'gmOnly', {
        name : 'whisper-as.gmOnly',
        hint : "whisper-as.gmOnlyHint",
        scope : 'world',
        config : true,
        type : Boolean,
        default : false
    });
    game.settings.register('whisper-as', 'gmOnlyAlias', {
        name : 'whisper-as.gmOnlyAlias',
        hint : "whisper-as.gmOnlyAliasHint",
        scope : 'world',
        config : true,
        type : Boolean,
        default : true
    });
    game.settings.register('whisper-as', 'defaultToCharacter', {
        name : 'whisper-as.defaultToCharacter',
        hint : "whisper-as.defaultToCharacterHint",
        scope : 'client',
        config : true,
        type : Boolean,
        default : true
    });
    game.settings.register('whisper-as', 'activePlayersOnly', {
        name : 'whisper-as.activePlayersOnly',
        hint : "whisper-as.activePlayersOnlyHint",
        scope : 'client',
        config : true,
        type : Boolean,
        default : false
    });
    game.settings.register('whisper-as', 'currentSceneTokensOnly', {
        name : 'whisper-as.currentSceneTokensOnly',
        hint : "whisper-as.currentSceneTokensOnlyHint",
        scope : 'client',
        config : true,
        type : Boolean,
        default : false
    });
    game.settings.register('whisper-as', 'warnIfNoRecipients', {
        name : 'whisper-as.warnIfNoRecipients',
        hint : "whisper-as.warnIfNoRecipientsHint",
        scope : 'client',
        config : true,
        type : Boolean,
        default : false
    });
});

Hooks.on('renderSidebarTab', (app, html, data) => {
    if (app.tabName !== "chat") {
        return;
    }

    const whisperAsPattern = new RegExp(/^\/w(?:hisper)?(?:-)?as\s{1}/, "i");

    function handleChatInput() {
        const gmOnly = game.settings.get('whisper-as', 'gmOnly');
        if (gmOnly && !game.user.isGM) {
            return;
        }

        const chatContent = $("#chat-message").val();
        if (!chatContent.match(whisperAsPattern)) {
            return;
        }
        
        new WhisperAsFormApplication(chatContent.replace(whisperAsPattern, '')).render(true);
    }

    $("#chat-message").on("input.whisperer", handleChatInput);
});