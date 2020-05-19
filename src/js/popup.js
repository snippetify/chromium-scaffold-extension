import {
    SNIPPETIFY_SAVE_USER,
    REVIEW_SLECTED_SNIPPET,
    SNIPPETIFY_FOUND_SNIPPETS
} from './contants'

/**
 * Browser action. Popup script.
 * @license MIT
 * @author Evens Pierre <pierre.evens16@gmail.com>
*/
class Popup {
    constructor () {
        $(document).ready(() => {
            this.hydrateUserCard()
            this.hydrateSnippetsList()
            this.addListenersToViews()
        })
    }

    hydrateSnippetsList () {
        chrome.storage.local.get(SNIPPETIFY_FOUND_SNIPPETS, data => {
            const items = data[SNIPPETIFY_FOUND_SNIPPETS]
            const container = $('.snippet-box .snippet-list')
            if (items && items.length > 0) {
                container.html('')
                $('.snippet-box .title').after(`<small class="ml-auto text-secondary total-found">${items.length} found in this page</small>`)
                items.forEach(v => {
                    const row = $('<div class="snippet-row"></div>')
                    const lang = $('<span class="language"></span>')
                    row.html($(`<pre class="p-0 my-1" data-snippet='${JSON.stringify(v)}'></pre>`)
                        .html($('<code class="mt-0 pt-0 d-block"></code>').html(v.code)))
                    if (v.tags && v.tags.length > 0) {
                        lang.text(v.tags[0])
                        row.prepend(lang)
                    }
                    container.append(row)
                })
                $('.snippet-box .snippet-list pre').each((_, el) => { (new SimpleBar(el)).recalculate() })
            }
        })
    }

    hydrateUserCard () {
        chrome.storage.local.get(SNIPPETIFY_SAVE_USER, data => {
            const userCard = $('#userCard')
            const userInfo = data[SNIPPETIFY_SAVE_USER]
            if (!userInfo) {
                userCard.hide()
            } else {
                if (userInfo.avatar.medium) {
                    userCard.find('.avatar').removeClass('hidden')
                    userCard.find('.avatar-placeholder').addClass('hidden')
                    userCard.find('.avatar').find('img').attr('src', userInfo.avatar.medium)
                } else {
                    userCard.find('.avatar').addClass('hidden')
                    userCard.find('.avatar-placeholder').removeClass('hidden').find('.letter').text((userInfo.username || ' ').charAt(0))
                }
                userCard.find('.username').text(userInfo.username)
                userCard.find('.email').text(userInfo.email)
                userCard.find('.diamond-count').text(4)
                userCard.find('.rubis-count').text(12)
                userCard.find('.saphir-count').text(34)
                userCard.find('.snippets-count').text('20 snippets')
                userCard.find('.challenges-count').text('120 challenges')
            }
        })
    }

    addListenersToViews () {
        $('#app').on('click', '[data-snippet]', e => {
            chrome.storage.local.set({ [REVIEW_SLECTED_SNIPPET]: $(e.currentTarget).data('snippet') })
        })
    }
}

export default new Popup()
