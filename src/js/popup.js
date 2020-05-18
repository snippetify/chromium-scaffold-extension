import { SNIPPETIFY_SAVE_USER } from './contants'

$(document).ready(() => {
    chrome.storage.local.get(SNIPPETIFY_SAVE_USER, data => {
        const userCard = $('#userCard')
        const userInfo = data[SNIPPETIFY_SAVE_USER]
        if (!userInfo) {
            userCard.hide()
        } else {
            userCard.find('img').attr('src', userInfo.avatar.medium)
            userCard.find('.username').text(userInfo.username)
            userCard.find('.email').text(userInfo.email)
        }
    })
})
