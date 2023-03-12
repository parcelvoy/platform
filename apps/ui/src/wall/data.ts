/* eslint-disable @typescript-eslint/consistent-type-assertions */
import { Wall } from './Brick'

/* eslint-disable quote-props */
export default {
    type: 'wall',
    uuid: '07b7d71a-cc47-4db7-b3eb-b90c237046a3',
    children: [
        {
            uuid: 'cf579d3d-255d-4c2b-a1a6-0a8aca0eda18',
            type: 'head',
        },
        {
            uuid: '6243bbfd-68a4-42f9-8037-f7ebf7aab549',
            type: 'body',
            children: [
                {
                    uuid: 'b371685d-1f09-490c-bd06-b98edcac417d',
                    type: 'section',
                    attributes: {
                        'background-color': '#f0f0f0',
                        'padding': '20px',
                    },
                    children: [{
                        uuid: 'cb68b084-47b2-4a0d-a041-aeb5d525f3b7',
                        type: 'column',
                        attributes: {
                            width: '50%',
                        },
                        children: [{
                            uuid: '43820ed5-2a17-4ea4-8e1d-18edd73921f5',
                            type: 'text',
                            attributes: {
                                'font-style': 'italic',
                                'font-size': '20px',
                                'color': '#626262',
                            },
                            value: 'My Company',
                        }],
                    },
                    {
                        uuid: 'f42b99a3-4034-4c1a-9061-ddf47a9b3fd7',
                        type: 'column',
                        attributes: {
                            width: '50%',
                        },
                        children: [{
                            uuid: '0db9c857-04fe-4a81-8a0d-5aa77d7d8142',
                            type: 'text',
                            attributes: {
                                'font-style': 'italic',
                                'font-size': '15px',
                                'color': '#626262',
                                'padding': '20px 0',
                            },
                            value: 'Tagline',
                        }],
                    }],
                },
                {
                    uuid: 'c9a6ad41-0a8e-4b75-a0ba-3ac2d084e3be',
                    type: 'section',
                    attributes: {
                        'background-url': "http://1.bp.blogspot.com/-TPrfhxbYpDY/Uh3Refzk02I/AAAAAAAALw8/5sUJ0UUGYuw/s1600/New+York+in+The+1960's+-+70's+(2).jpg",
                        'background-size': 'cover',
                        'background-repeat': 'no-repeat',
                    },
                    children: [
                        {
                            uuid: '67dca46b-1251-4758-b979-f1355ee639c7',
                            type: 'column',
                            attributes: {
                                'width': '600px',
                            },
                            children: [
                                {
                                    uuid: '893ebafa-0bc5-47c7-8868-c486a5b55f0b',
                                    type: 'text',
                                    attributes: {
                                        'align': 'center',
                                        'color': '#fff',
                                        'font-size': '40px',
                                    },
                                    value: 'Slogan Here',
                                },
                                {
                                    uuid: '2953fdf0-76f5-4a57-86ef-2670d33e8996',
                                    type: 'button',
                                    attributes: {
                                        'background-color': '#F63A4D',
                                        'href': '#',
                                    },
                                    value: 'Promotion',
                                },
                            ],
                        },
                    ],
                },
                {
                    uuid: 'd3069db7-701f-457d-94af-6f1635e1da7b',
                    type: 'section',
                    attributes: { 'background-color': '#fafafa' },
                    children: [
                        {
                            uuid: '89aa6ecd-497e-4cea-88d0-3c60f8d742ca',
                            type: 'column',
                            attributes: { width: '400px' },
                            children: [
                                {
                                    uuid: 'b9ca9e31-e758-4749-9460-84ad96f4a817',
                                    type: 'text',
                                    attributes: {
                                        'font-style': 'italic',
                                        'font-size': '20px',
                                        'font-family': 'Helvetica Neue',
                                        'color': '#626262',
                                    },
                                    value: 'My Awesome Text',
                                },
                                {
                                    uuid: '6bcfd29c-cce3-46fc-b1ea-5ed59d15bb81',
                                    type: 'text',
                                    value: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin rutrum enim eget magna efficitur, eu semper augue semper. Aliquam erat volutpat. Cras id dui lectus. Vestibulum sed finibus lectus, sit amet suscipit nibh. Proin nec commodo purus. Sed eget nulla elit. Nulla aliquet mollis faucibus.',
                                },
                            ],
                        },
                    ],
                },
            ],
        },
    ],
} as Wall
