/* eslint-disable @typescript-eslint/comma-dangle */
/* eslint-disable quote-props */

interface BrickConfigType {
    defaultAttributes?: Record<string, any>
    containerAttributes?: string[]
    elementAttributes?: string[]
    attributes?: Record<string, any>
    element: string
    container?: boolean
}

export const BrickConfig: Record<string, BrickConfigType> = {
    'wall': {
        attributes: {
            lang: 'string',
            dir: 'string'
        },
        element: 'mjml'
    },
    'body': {
        attributes: {
            'background-color': 'string',
            'width': 'string'
        },
        element: 'mjml-body',
        container: true
    },
    'button': {
        defaultAttributes: {
            'align': 'center',
            'background-color': '#414141',
            'border': 'none',
            'border-radius': '3px',
            'color': '#ffffff',
            'font-family': 'Ubuntu, Helvetica, Arial, sans-serif',
            'font-size': '13px',
            'font-weight': 'normal',
            'inner-padding': '10px 25px',
            'line-height': '120%',
            'padding': '10px 25px',
            'target': '_blank',
            'text-decoration': 'none',
            'text-transform': 'none',
            'vertical-align': 'middle'
        },
        containerAttributes: [
            'align',
            'container-background-color',
            'letter-spacing',
            'padding',
            'padding-bottom',
            'padding-left',
            'padding-right',
            'padding-top'
        ],
        elementAttributes: [
            'background-color',
            'border',
            'border-bottom',
            'border-left',
            'border-radius',
            'border-right',
            'border-top',
            'color',
            'font-family',
            'font-size',
            'font-style',
            'font-weight',
            'height',
            'href',
            'inner-padding',
            'name',
            'rel',
            'target',
            'text-align',
            'text-decoration',
            'text-transform',
            'title',
            'vertical-align',
            'width',
            'line-height'
        ],
        attributes: {
            'align': 'string',
            'background-color': 'string',
            'border': 'string',
            'border-bottom': 'string',
            'border-left': 'string',
            'border-radius': 'px',
            'border-right': 'string',
            'border-top': 'string',
            'color': 'color',
            'container-background-color': 'color',
            'css-class': 'string',
            'font-family': 'string',
            'font-size': 'px',
            'font-style': 'string',
            'font-weight': 'number',
            'height': 'px',
            'href': 'link',
            'inner-padding': 'px',
            'padding': 'px',
            'padding-bottom': 'px',
            'padding-left': 'px',
            'padding-right': 'px',
            'padding-top': 'px',
            'target': 'string',
            'width': 'px'
        },
        element: 'mj-button',
        container: false
    },
    'section': {
        defaultAttributes: {
            'background-repeat': 'repeat',
            'background-size': 'auto',
            'background-position': 'top center',
            'direction': 'ltr',
            'padding': '20px 0px',
            'text-align': 'center',
            'text-padding': '4px 4px 4px 0'
        },
        attributes: {
            'background-color': 'color',
            'background-position': 'string',
            'background-repeat': 'string',
            'background-url': 'url',
            'border': 'string',
            'border-bottom': 'string',
            'border-left': 'string',
            'border-radius': 'px',
            'border-right': 'string',
            'border-top': 'string',
            'css-class': 'string',
            'direction': {
                type: 'options',
                values: ['ltr', 'rtl']
            },
            'full-width': 'string',
            'padding': 'px',
            'padding-bottom': 'px',
            'padding-left': 'px',
            'padding-right': 'px',
            'padding-top': 'px',
            'text-align': 'string'
        },
        element: 'mj-section',
        container: true
    },
    'column': {
        attributes: {
            'background-color': 'color',
            'border': 'string',
            'border-bottom': 'string',
            'border-left': 'string',
            'border-radius': 'px',
            'border-right': 'string',
            'border-top': 'string',
            'css-class': 'string',
            'width': 'number',
            'padding': 'px',
            'padding-bottom': 'px',
            'padding-left': 'px',
            'padding-right': 'px',
            'padding-top': 'px',
        },
        element: 'mj-column',
        container: true
    },
    'divider': {
        attributes: {
            'align': 'string',
            'border-color': 'color',
            'border-style': 'string',
            'border-width': 'px',
            'container-background-color': 'color',
            'css-class': 'string',
            'width': 'number',
            'padding': 'px',
            'padding-bottom': 'px',
            'padding-left': 'px',
            'padding-right': 'px',
            'padding-top': 'px',
        },
        element: 'mj-divider',
        container: false
    },
    'text': {
        attributes: { },
        containerAttributes: [
            'container-background-color',
            'padding-bottom',
            'padding-left',
            'padding-right',
            'padding-top',
            'padding'
        ],
        elementAttributes: [
            'background-color',
            'align',
            'color',
            'font-family',
            'font-size',
            'font-style',
            'font-weight',
            'line-height',
            'text-transform',
            'text-decoration',
            'height',
            'letter-spacing',
            'vertical-align'
        ],
        defaultAttributes: {
            'align': 'left',
            'color': '#000000',
            'font-family': 'Ubuntu, Helvetica, Arial, sans-serif',
            'font-size': '13px',
            'line-height': '1',
            'padding': '10px 25px'
        },
        element: 'mj-text'
    }
}
