import $ from 'jquery'
import {
    CS_PORT,
    SNIPPETIFY_URL,
    CS_SNIPPETS_COUNT,
    SNIPPETIFY_DOMAIN,
    SNIPPETIFY_API_URL,
    SNIPPETIFY_API_TOKEN,
    SNIPPETIFY_SAVE_USER
} from './contants'

/**
 * App event listeners.
 * @license MIT
 * @author Evens Pierre <pierre.evens16@gmail.com>
*/
class Background {
    constructor () {
        this.onInstalled()
        this.updateBadgeText()
        this.onCommandExecuted()
        this.createCookieListener()
        this.onContextMenuClicked()
    }

    onInstalled () {
        const self = this
        chrome.runtime.onInstalled.addListener(function () {
            self.createContextMenu()
            self.saveCookieToStorage()
        })
    }

    get csPort () {
        return chrome.runtime.connect({ name: CS_PORT })
    }

    createContextMenu () {
        chrome.contextMenus.create({
            id: 'snippetifyContextMenu',
            title: 'Save snippet',
            contexts: ['selection']
        })
    }

    onContextMenuClicked () {
        chrome.contextMenus.onClicked.addListener(function (info) {
            console.log(`Text: ${info.selectionText}, url: ${info.pageUrl}`)
        })
    }

    onCommandExecuted () {
        chrome.commands.onCommand.addListener(function (command) {
            console.log('Command:', command)
        })
    }

    saveCookieToStorage () {
        chrome.cookies.get({ url: SNIPPETIFY_URL, name: 'token' }, cookie => {
            const value = ((cookie || {}).value || '')
            if (value.length > 1) {
                chrome.storage.local.set({ [SNIPPETIFY_API_TOKEN]: value }, () => {
                    this.authenticateUser(value)
                })
            } else {
                chrome.storage.local.remove(SNIPPETIFY_API_TOKEN, () => {
                    this.logoutUser()
                })
            }
        })
    }

    createCookieListener () {
        chrome.cookies.onChanged.addListener(e => {
            if ((e.cookie || {}).domain !== SNIPPETIFY_DOMAIN) return
            if (e.removed) {
                chrome.storage.local.remove(SNIPPETIFY_API_TOKEN, () => {
                    this.logoutUser()
                })
            } else {
                chrome.storage.local.set({ [SNIPPETIFY_API_TOKEN]: e.cookie.value }, () => {
                    this.authenticateUser(e.cookie.value)
                })
            }
        })
    }

    updateBadgeText () {
        chrome.runtime.onConnect.addListener(port => {
            if (port.name !== CS_PORT) return
            port.onMessage.addListener(e => {
                if (e.type !== CS_SNIPPETS_COUNT) return
                chrome.browserAction.setBadgeText({ text: `${e.payload || ''}` })
            })
        })
    }

    authenticateUser (token) {
        $.ajax({
            method: 'GET',
            url: `${SNIPPETIFY_API_URL}/users/me`,
            contentType: 'application/json',
            crossDomain: true,
            headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${token}`
            }
        }).done(res => {
            chrome.storage.local.set({ [SNIPPETIFY_SAVE_USER]: res.data })
        }).fail((xhr, status) => {
            chrome.storage.local.remove(SNIPPETIFY_SAVE_USER)
        })
    }

    logoutUser () {
        chrome.storage.local.remove(SNIPPETIFY_API_TOKEN)
        chrome.storage.local.remove(SNIPPETIFY_SAVE_USER)
    }
}

// Initialisation
export default new Background()
