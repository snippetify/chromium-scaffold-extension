import {
    CS_PORT,
    CS_SNIPPETS_COUNT,
    CS_SELECTED_SNIPPET,
    SNIPPETIFY_API_TOKEN,
    REVIEW_SLECTED_SNIPPET,
    SNIPPETIFY_FOUND_SNIPPETS
} from './contants'

/**
 * Content scripts
 * @license MIT
 * @author Evens Pierre <pierre.evens16@gmail.com>
*/
class ContentScripts {
    // Properties
    vm
    simpleMde
    codeMirror

    get port () {
        return chrome.runtime.connect({ name: CS_PORT })
    }

    get modalUrl () {
        return chrome.runtime.getURL('page_modal.html')
    }

    constructor () {
        this.addBtnToCodeTag()
        this.saveFoundSnippets()
        this.onPageVisibilityChanged()
        this.postSnippetsCountMessage()
        this.appendModalTemplateToPage()
        this.listenForSnippetReviewMessage()
    }

    postSnippetsCountMessage () {
        this.port.postMessage({ type: CS_SNIPPETS_COUNT, payload: $('pre > code').length })
    }

    postSelectedSnippetMessage (payload) {
        this.port.postMessage({ type: CS_SELECTED_SNIPPET, payload: payload })
    }

    addBtnToCodeTag () {
        $('pre > code').each((_, el) => {
            $(el).parent().addClass('snippetify-snippet-wrapper')
            $(el).after($('<a href="#" class="save-btn" id="snippetifyAction"></a>'))
        })
        this.onSnippetBtnClicked()
    }

    onPageVisibilityChanged () {
        window.addEventListener('visibilitychange', () => {
            this.saveFoundSnippets()
            this.postSnippetsCountMessage()
        })
    }

    getSnippetToken (callback) {
        chrome.storage.sync.get(SNIPPETIFY_API_TOKEN, callback)
    }

    listenForSnippetReviewMessage () {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            for (const key in changes) {
                if (key === REVIEW_SLECTED_SNIPPET) {
                    const item = changes[key]
                    console.log('value..')
                    console.log(JSON.stringify(item.newValue))
                }
            }
        })
    }

    createVuejsInstance () {
        if (this.vm) return
        this.vm = new Vue({
            el: '#snippetifyWrapper',
            data: {
                modalTitle: 'Save snippet',
                title: '',
                code: '',
                desc: '',
                tags: ''
            },
            methods: {
                submit () {
                    console.log(JSON.stringify(this.getPayload()))
                },
                getPayload () {
                    return {
                        title: this.title,
                        code: this.code,
                        tags: this.tags,
                        description: this.desc
                    }
                }
            }
        })
    }

    appendModalTemplateToPage () {
        const self = this
        $.get(this.modalUrl, (data) => {
            $('body').append($('<div id="snippetifyWrapper">').html(data))
            self.createVuejsInstance() // Init vuejs
            self.createCodeMirrorInstance() // Init codeMirror
            self.createSimpleMdeInstance() // Init simple mde
        })
    }

    createCodeMirrorInstance () {
        this.codeMirror = CodeMirror.fromTextArea($('#snippetifyWrapper #code')[0], {
            lineNumbers: true
        })
    }

    createSimpleMdeInstance () {
        this.simpleMde = new SimpleMDE({
            forceSync: true,
            placeholder: 'Add a description',
            element: $('#snippetifyWrapper #desc')[0]
        })
    }

    getSnippetFromPage (parent) {
        const getTags = parent => { // Get tags from page
            return (parent.attr('class') || '').split(' ')
                .filter(v => (v || '').includes('language'))
                .flatMap(e => (e || '').split('-'))
                .filter(e => (e || '').trim().length > 0 && e !== 'language')
        }

        return {
            title: $('head > title').text(),
            code: parent.find('code').html(),
            desc: `${parent.prev('p').html()} ${parent.next('p').html()}`,
            tags: getTags(parent),
            meta: { name: window.location.hostname, url: window.location.href }
        }
    }

    hydrateModalForm (payload) {
        const self = this
        this.vm.title = payload.title
        this.vm.tags = payload.tags.join(', ')
        this.codeMirror.setValue(payload.code)
        this.codeMirror.setOption('mode', { name: payload.tags[0] })
        this.codeMirror.on('change', function () {
            self.vm.code = self.codeMirror.getValue()
        })
        this.simpleMde.value(payload.desc)
        this.simpleMde.codemirror.on('change', function () {
            self.vm.desc = self.simpleMde.value()
        })
    }

    onSnippetBtnClicked () {
        const self = this
        $('pre').on('click', '#snippetifyAction', function (e) {
            const payload = self.getSnippetFromPage($(e.currentTarget).parent().first()) // Get snippet
            self.postSelectedSnippetMessage(payload) // Post selected snippet
            $('#snippetForm').modal('show') // Show modal
            self.hydrateModalForm(payload) // Hydrate form
            return false // Prevent default
        })
    }

    saveFoundSnippets () {
        const items = []
        $('pre > code').each((_, el) => {
            items.push(this.getSnippetFromPage($(el).parent().first())) // Get snippet
        })
        chrome.storage.local.set({ [SNIPPETIFY_FOUND_SNIPPETS]: items })
    }
}

export default new ContentScripts()
