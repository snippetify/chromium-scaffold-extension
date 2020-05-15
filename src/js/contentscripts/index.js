chrome.runtime.onInstalled.addListener(function () {
    chrome.contextMenus.create({
        id: 'snippetifyContextMenu',
        title: 'Save snippet',
        contexts: ['selection']
    })
})
