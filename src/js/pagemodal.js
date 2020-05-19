import {
    CS_TARGET,
    BG_TARGET,
    CS_OPEN_MODAL,
    CS_CLOSE_MODAL,
    CREATE_NEW_TAB,
    CS_MODAL_TARGET,
    SNIPPETIFY_API_TOKEN
} from './contants'

/**
 * Background. App event listeners.
 * @license MIT
 * @author Evens Pierre <pierre.evens16@gmail.com>
*/
class PageModal {
    // Properties
    vm
    simpleMde
    codeMirror

    constructor () {
        $(document).ready(() => {
            if ($('#app').length > 0) {
                this.createCodeMirrorInstance()
                this.createSimpleMdeInstance()
                this.registerEventListeners()
            }
        })

        this.showModalEventListener()
    }

    showModalEventListener () {
        chrome.runtime.onMessage.addListener(e => {
            if (e.target === CS_MODAL_TARGET && e.type === CS_OPEN_MODAL) {
                chrome.storage.local.get(SNIPPETIFY_API_TOKEN, data => {
                    const token = data[SNIPPETIFY_API_TOKEN]
                    if (token) {
                        $('#snippetForm').modal('show')
                    } else {
                        $('#unauthenticatedModal').modal('show')
                    }
                })
            }
        })
    }

    registerEventListeners () {
        // On modal hidden
        $('#snippetForm, #unauthenticatedModal').on('hidden.bs.modal', function (e) {
            chrome.runtime.sendMessage({ target: CS_TARGET, type: CS_CLOSE_MODAL })
        })

        // On Save clicked
        $('#snippetForm').on('click', '#save', e => {
            return false
        })

        // Connect now
        $('#app').on('click', '#connectNow', e => {
            chrome.runtime.sendMessage({ target: CS_TARGET, type: CS_CLOSE_MODAL })
            chrome.runtime.sendMessage({ target: BG_TARGET, type: CREATE_NEW_TAB, payload: 'https://snippetify.com/connect' })
            return false
        })
    }

    createCodeMirrorInstance () {
        this.codeMirror = CodeMirror.fromTextArea($('#snippetForm #code')[0], {
            lineNumbers: true
        })
    }

    createSimpleMdeInstance () {
        this.simpleMde = new SimpleMDE({
            forceSync: true,
            placeholder: 'Add a description',
            element: $('#snippetForm #desc')[0]
        })
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
}

export default new PageModal()
