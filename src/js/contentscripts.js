import {
    CS_TARGET,
    CS_OPEN_MODAL,
    CS_CLOSE_MODAL,
    CS_MODAL_TARGET,
    CS_SNIPPETS_COUNT,
    CS_FOUND_SNIPPETS,
    REVIEW_SLECTED_SNIPPET
} from './contants'

/**
 * Content scripts
 * @license MIT
 * @author Evens Pierre <pierre.evens16@gmail.com>
*/
class ContentScripts {
    constructor () {
        this.insertIframeToDom()
        this.snippetReviewListener()
        this.navigationEventListener()
        this.insertSnippetActionToDom()
    }

    /**
     * Get page modal url
     * @returns string
    */
    get modalUrl () {
        return chrome.runtime.getURL('page_modal.html')
    }

    /**
     * Fire new event on navigator tab changed.
     * @returns void
     */
    navigationEventListener () {
        chrome.runtime.onMessage.addListener((e, sender, callback) => {
            if (e.target === CS_TARGET && e.type === CS_SNIPPETS_COUNT) { // Snippet count
                const payload = { payload: $('pre > code, .highlight > pre').length }
                callback(payload)
            } else if (e.target === CS_TARGET && e.type === CS_FOUND_SNIPPETS) { // Snippet list
                const items = []
                $('pre > code, .highlight > pre').each((_, el) => {
                    items.push(this.fetchSnippetFromDom($(el).parent().first()))
                })
                const payload = { payload: items }
                callback(payload)
            }
        })
    }

    /**
     * Listen selected snippet event from browser popup.
     * @returns void
     */
    snippetReviewListener () {
        chrome.runtime.onMessage.addListener(e => {
            if (e.target === CS_TARGET && e.type === REVIEW_SLECTED_SNIPPET) this.openIframe(e.payload)
        })
    }

    /**
     * Get snippet from page and create a snippet object.
     * @returns array
     */
    fetchSnippetFromDom (parent) {
        return {
            title: $('head > title').text(),
            code: parent.find('code, pre').html(),
            desc: `${parent.prev('p').html()} ${parent.next('p').html()}`,
            tags: this.fetchTagsFromDom(parent),
            meta: {
                target: {
                    type: 'chrome-ext',
                    name: chrome.runtime.getManifest().name,
                    version: chrome.runtime.getManifest().version
                },
                webiste: {
                    url: window.location.href,
                    name: window.location.hostname,
                    brand: $('[property="og:image"]').attr('content')
                }
            }
        }
    }

    fetchTagsFromDom (parent) {
        // With class language-{tag} or lang-{tag}
        const tags = []

        // Language or lang
        if (parent.attr('class').includes('lang') && parent.attr('class').includes('language')) {
            parent.attr('class')
                .split(' ')
                .filter(v => v.includes('language') || v.includes('lang'))
                .flatMap(v => v.split('-'))
                .filter(v => v.trim().length > 0 && !['language', 'lang'].includes(v.trim()))
                .forEach(v => tags.push(v))
        }

        // With data-lang in code tag
        if (parent.find('[data-lang]').length > 0) tags.push(parent.find('[data-lang]').data('lang'))

        // highlight
        if (parent.attr('class').includes('highlight')) {
            parent.attr('class')
                .split(' ')
                .filter(v => v.includes('highlight-source'))
                .flatMap(v => v.split('-'))
                .filter(v => v.trim().length > 0 && !['source', 'highlight'].includes(v.trim()))
                .forEach(v => tags.push(v))
        }

        // hljs
        if (parent.attr('class').includes('hljs')) {
            parent.attr('class')
                .split(' ')
                .filter(v => v.includes('highlight'))
                .flatMap(v => v.split('-'))
                .filter(v => v.trim().length > 0 && !['highlight'].includes(v.trim()))
                .forEach(v => tags.push(v))
        }

        // hljs in code tag
        if (parent.find('.hljs').length) {
            parent.find('.hljs')
                .attr('class')
                .split(' ')
                .filter(v => !v.includes('hljs'))
                .filter(v => v.trim().length > 0)
                .forEach(v => tags.push(v))
        }

        // Return tags
        return tags
    }

    /**
     * Insert snippetify btn to the DOM.
     * @returns void
     */
    insertSnippetActionToDom () {
        // Insert an action button to dom
        $('pre > code, .highlight > pre').each((_, el) => {
            $(el).parent().addClass('snippetify-snippet-wrapper')
            $(el).after($('<a href="#" class="snippet-action" id="snippetifyAction"></a>'))
        })

        // Add listener
        $('pre, .highlight').on('click', '#snippetifyAction', e => {
            this.openIframe(this.fetchSnippetFromDom($(e.currentTarget).parent().first())) // Open iframe
            return false // Prevent default
        })
    }

    /**
     * Append iframe to dom.
     * Frame contains a modal for snippet saving.
     * @returns void
     */
    insertIframeToDom () {
        // Append frame to dom
        $('body').append($('<iframe>')
            .addClass('snippetify-iframe hide').attr({
                src: this.modalUrl,
                id: 'snippetifyIframe',
                name: 'snippetifyIframe'
            }))

        // Add frame listener
        chrome.runtime.onMessage.addListener(e => {
            if (e.target === CS_TARGET && e.type === CS_CLOSE_MODAL) this.closeIframe()
        })
    }

    /**
     * Fire event to open iframe and inner modal.
     * @returns void
     */
    openIframe (payload) {
        $('#snippetifyIframe').removeClass('hide')
        chrome.runtime.sendMessage({ target: CS_MODAL_TARGET, type: CS_OPEN_MODAL, payload: payload })
    }

    /**
     * Close the iframe.
     * @returns void
     */
    closeIframe () {
        $('#snippetifyIframe').addClass('hide')
    }
}

export default new ContentScripts()
