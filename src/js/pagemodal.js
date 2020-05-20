import {
    CS_TARGET,
    BG_TARGET,
    CS_OPEN_MODAL,
    RELOAD_IFRAME,
    CS_CLOSE_MODAL,
    CREATE_NEW_TAB,
    CS_MODAL_TARGET,
    SNIPPETIFY_API_TOKEN,
    SNIPPETIFY_API_URL
} from './contants'

/**
 * Background. App event listeners.
 * @license MIT
 * @author Evens Pierre <pierre.evens16@gmail.com>
*/
class PageModal {
    // Properties
    simpleMde
    codeMirror
    payload = {}

    constructor () {
        $(document).ready(() => {
            if ($('#app').length > 0) {
                this.createCodeMirrorInstance()
                this.createSimpleMdeInstance()
                this.localEventListeners()
            }
        })

        this.remoteEventListener()
    }

    /**
     * Listen for remote native event.
     * @returns void
    */
    remoteEventListener () {
        // Open modal
        chrome.runtime.onMessage.addListener(e => {
            if (e.target === CS_MODAL_TARGET && e.type === CS_OPEN_MODAL) {
                chrome.storage.local.get(SNIPPETIFY_API_TOKEN, data => {
                    const token = data[SNIPPETIFY_API_TOKEN]
                    if (token) {
                        this.hydrateForm(e.payload) // Hydrate form
                        // Reset element state
                        $('#snippetForm #save').removeClass('d-none')
                        $('#snippetForm .done-body').addClass('d-none')
                        $('#snippetForm .form-body').removeClass('d-none')
                        $('#snippetForm #save .saving').addClass('d-none')
                        $('#snippetForm #save .normal').removeClass('d-none')
                        $('#snippetForm').modal('show') // Show modal
                    } else {
                        $('#unauthenticatedModal').modal('show')
                    }
                })
            }
        })

        // Reload iframe
        chrome.runtime.onMessage.addListener((e, sender, callback) => {
            if (e.target === CS_MODAL_TARGET && e.type === RELOAD_IFRAME) {
                window.location.reload()
                callback()
            }
        })
    }

    /**
     * Listen for locale dom event.
     * @returns void
    */
    localEventListeners () {
        // On modal hidden
        $('#snippetForm, #unauthenticatedModal').on('hidden.bs.modal', () => {
            chrome.runtime.sendMessage({ target: CS_TARGET, type: CS_CLOSE_MODAL })
        })

        // On Save clicked
        $('#snippetForm').on('click', '#save', e => {
            this.saveSnippet()
            return false
        })

        // Field focus and blur
        // Validate form
        $('#snippetForm input.form-control').on('blur', e => {
            this.validateField($(e.target).val(), e.target)
        })

        // Connect now, redirect to snippetify
        $('#app').on('click', '#connectNow', e => {
            $('.modal').modal('hide')
            chrome.runtime.sendMessage({ target: CS_TARGET, type: CS_CLOSE_MODAL })
            chrome.runtime.sendMessage({ target: BG_TARGET, type: CREATE_NEW_TAB, payload: 'https://snippetify.com/connect' })
            return false
        })

        // Hide frame when modal id hidden
        $('body').on('click', '.modal-backdrop', e => {
            $('.modal').modal('hide')
        })
    }

    /**
     * Create an instance of codemirror.
     * @returns void
    */
    createCodeMirrorInstance () {
        this.codeMirror = CodeMirror.fromTextArea($('#snippetForm #code')[0], {
            lineNumbers: true
        })
    }

    /**
     * Create an instance of simpleMde.
     * @returns void
    */
    createSimpleMdeInstance () {
        this.simpleMde = new SimpleMDE({
            forceSync: true,
            placeholder: 'Add a description',
            element: $('#snippetForm #description')[0]
        })
    }

    /**
     * Save snippet.
     * Make http request to snippetify.
     * @returns void
    */
    saveSnippet () {
        if (this.validateForm(true)) return
        $('#snippetForm #save').attr('disabled', true)
        $('#snippetForm #save .normal').addClass('d-none')
        $('#snippetForm #save .saving').removeClass('d-none')
        chrome.storage.local.get(SNIPPETIFY_API_TOKEN, data => {
            const token = data[SNIPPETIFY_API_TOKEN]
            if (token) {
                $.ajax({
                    method: 'POST',
                    data: JSON.stringify(this.payload),
                    url: `${SNIPPETIFY_API_URL}/snippets`,
                    contentType: 'application/json',
                    dataType: 'json',
                    crossDomain: true,
                    processData: false,
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`
                    }
                }).done(res => {
                    $('#snippetForm #save').addClass('d-none')
                    $('#snippetForm .form-body').addClass('d-none')
                    $('#snippetForm .done-body').removeClass('d-none')
                }).fail((xhr, status) => {
                    this.printServerErrors(xhr)
                }).always(() => {
                    $('#snippetForm #save').attr('disabled', false)
                    $('#snippetForm #save .saving').addClass('d-none')
                    $('#snippetForm #save .normal').removeClass('d-none')
                })
            }
        })
    }

    /**
     * Add data to dom input element.
     * @returns void
    */
    hydrateForm (payload) {
        this.payload = payload
        this.simpleMde.value(payload.desc)
        $('form #title').val(payload.title)
        $('form #tags').val(payload.tags.join(', '))
        this.codeMirror.setOption('mode', { name: payload.tags[0] })
        this.codeMirror.setValue($('<div>').html(payload.code).text())
        this.codeMirror.on('change', () => {
            this.payload.code = this.codeMirror.getValue()
            this.validateField(this.payload.code, $('#snippetForm #code')[0])
        })
        this.simpleMde.codemirror.on('change', () => {
            this.payload.description = this.simpleMde.value()
            this.validateField(this.payload.description, $('#snippetForm #description')[0])
        })
        $('form-control').removeClass('is-invalid') // Reset for validation
        $('#snippetForm #save').attr('disabled', this.validateForm()) // Enable or disable save btn
    }

    /**
     * Single field validation.
     * @returns void
    */
    validateField (val, el) {
        if (val.trim().length < 2) $(el).addClass('is-invalid')
        else $(el).removeClass('is-invalid')
        $('#snippetForm #save').attr('disabled', this.validateForm())
    }

    /**
     * Form validation.
     * @returns boolean
    */
    validateForm (feedback) {
        let hasError = false

        $('input.form-control').each((_, el) => {
            if ($(el).val().trim().length < 2) {
                hasError = true
                if (feedback) $(el).addClass('is-invalid')
            } else if (feedback) {
                $(el).removeClass('is-invalid')
            }
        })

        if ((this.payload.code || '').length < 2) {
            hasError = true
            $('#snippetForm #code').addClass('is-invalid')
        }

        if ((this.payload.description || '').length < 2) {
            hasError = true
            $('#snippetForm #description').addClass('is-invalid')
        }

        return hasError
    }

    /**
     * Print server error.
     * @returns void
    */
    printServerErrors (e) {
        if (e.status === 422) {
            $.each(e.responseJSON.errors, (i, v) => {
                $(`#snippetForm #${i}`).addClass('is-invalid')
            })
        }
    }
}

export default new PageModal()
