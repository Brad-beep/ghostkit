/**
 * WordPress dependencies
 */
/**
 * Internal dependencies
 */
import getIcon from '../../utils/get-icon';

import metadata from './block.json';
import edit from './edit';
import save from './save';
import transforms from './transforms';

const { __ } = wp.i18n;

const { name } = metadata;

export { metadata, name };

export const settings = {
    ...metadata,
    title: __( 'Number Box', '@@text_domain' ),
    description: __( 'Show your progress and rewards using counting numbers.', '@@text_domain' ),
    icon: getIcon( 'block-counter-box', true ),
    keywords: [
        __( 'number', '@@text_domain' ),
        __( 'counter', '@@text_domain' ),
    ],
    ghostkit: {
        previewUrl: 'https://ghostkit.io/blocks/number-box/',
        customStylesCallback( attributes ) {
            const styles = {
                '--gkt-counter-box--number__font-size': 'undefined' !== typeof attributes.numberSize ? `${ attributes.numberSize }px` : undefined,
                '--gkt-counter-box--number__color': attributes.numberColor,
            };

            if ( attributes.hoverNumberColor ) {
                styles[ '&:hover' ] = {
                    '--gkt-counter-box--number__color': attributes.hoverNumberColor,
                };
            }

            return styles;
        },
        supports: {
            styles: true,
            frame: true,
            spacings: true,
            display: true,
            scrollReveal: true,
            customCSS: true,
        },
    },
    example: {
        attributes: {
            number: '77',
            numberColor: '#0366d6',
            ghostkitId: 'example-counter-box',
            ghostkitClassname: 'ghostkit-custom-example-counter-box',
            className: 'ghostkit-custom-example-counter-box',
        },
        innerBlocks: [
            {
                name: 'core/paragraph',
                attributes: {
                    content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent et eros eu felis.',
                },
            },
        ],
    },
    edit,
    save,
    transforms,
};
