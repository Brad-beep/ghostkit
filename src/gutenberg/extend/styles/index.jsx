/**
 * External dependencies
 */
import shorthash from 'shorthash';
import classnames from 'classnames/dedupe';
import deepEqual from 'deep-equal';

/**
 * WordPress dependencies
 */
const {
    applyFilters,
    addFilter,
} = wp.hooks;

const {
    getBlockType,
} = wp.blocks;

const {
    withSelect,
} = wp.data;

const {
    Component,
    Fragment,
} = wp.element;

const {
    createHigherOrderComponent,
} = wp.compose;

/**
 * Internal dependencies
 */
import camelCaseToDash from '../../utils/camel-case-to-dash';

const { GHOSTKIT } = window;

const cssPropsWithPixels = [ 'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width', 'border-width', 'border-bottom-left-radius', 'border-bottom-right-radius', 'border-top-left-radius', 'border-top-right-radius', 'border-radius', 'bottom', 'top', 'left', 'right', 'font-size', 'height', 'width', 'min-height', 'min-width', 'max-height', 'max-width', 'margin-left', 'margin-right', 'margin-top', 'margin-bottom', 'margin', 'padding-left', 'padding-right', 'padding-top', 'padding-bottom', 'padding', 'outline-width' ];

/**
 * Get styles from object.
 *
 * @param {object} data - styles data.
 * @param {string} selector - current styles selector (useful for nested styles).
 * @param {boolean} escape - escape strings to save in database.
 * @return {string} - ready to use styles string.
 */
const getStyles = ( data = {}, selector = '', escape = true ) => {
    const result = {};
    let resultCSS = '';

    // add styles.
    Object.keys( data ).map( ( key ) => {
        // object values.
        if ( data[ key ] !== null && typeof data[ key ] === 'object' ) {
            // media for different screens
            if ( /^media_/.test( key ) ) {
                resultCSS += ( resultCSS ? ' ' : '' ) + `@media #{ghostkitvar:${ key }} { ${ getStyles( data[ key ], selector, escape ) } }`;

            // @supports css
            } else if ( /^@supports/.test( key ) ) {
                resultCSS += ( resultCSS ? ' ' : '' ) + `${ key } { ${ getStyles( data[ key ], selector, escape ) } }`;

            // nested selectors.
            } else {
                let nestedSelector = selector;
                if ( nestedSelector ) {
                    if ( key.indexOf( '&' ) !== -1 ) {
                        nestedSelector = key.replace( /&/g, nestedSelector );

                    // inside exported xml file all & symbols converted to \u0026
                    } else if ( key.indexOf( 'u0026' ) !== -1 ) {
                        nestedSelector = key.replace( /u0026/g, nestedSelector );
                    } else {
                        nestedSelector = `${ nestedSelector } ${ key }`;
                    }
                } else {
                    nestedSelector = key;
                }
                resultCSS += ( resultCSS ? ' ' : '' ) + getStyles( data[ key ], nestedSelector, escape );
            }

        // style properties and values.
        } else if ( typeof data[ key ] !== 'undefined' && data[ key ] !== false ) {
            // fix selector > and < usage.
            if ( escape ) {
                selector = selector.replace( />/g, '&gt;' );
                selector = selector.replace( /</g, '&lt;' );
            }

            // inside exported xml file all > symbols converted to \u003e
            // inside exported xml file all < symbols converted to \u003c
            if ( selector.indexOf( 'u003e' ) !== -1 ) {
                selector = selector.replace( /u003e/g, '&gt;' );
                selector = selector.replace( /u003c/g, '&lt;' );
            }

            if ( ! result[ selector ] ) {
                result[ selector ] = '';
            }
            const propName = camelCaseToDash( key );
            let propValue = data[ key ];

            // inside exported xml file all " symbols converted to \u0022
            if ( typeof propValue === 'string' && propValue.indexOf( 'u0022' ) !== -1 ) {
                propValue = propValue.replace( /u0022/g, '"' );
            }
            // inside exported xml file all ' symbols converted to \u0027
            if ( typeof propValue === 'string' && propValue.indexOf( 'u0027' ) !== -1 ) {
                propValue = propValue.replace( /u0027/g, '\'' );
            }

            const thereIsImportant = / !important$/.test( propValue );
            if ( thereIsImportant ) {
                propValue = propValue.replace( / !important$/, '' );
            }

            // add pixels.
            if (
                ( typeof propValue === 'number' && propValue !== 0 && cssPropsWithPixels.includes( propName ) ) ||
                ( typeof propValue === 'string' && /^[0-9.\-]*$/.test( propValue ) )
            ) {
                propValue += 'px';
            }

            if ( thereIsImportant ) {
                propValue += ' !important';
            }

            result[ selector ] += ` ${ propName }: ${ propValue };`;
        }
    } );

    // add styles to selectors.
    Object.keys( result ).map( ( key ) => {
        resultCSS = `${ key } {${ result[ key ] } }${ resultCSS ? ` ${ resultCSS }` : '' }`;
    } );

    return resultCSS;
};

/**
 * Get styles attribute.
 *
 * @param {object} data - styles data.
 * @param {object} blockType - styles data.
 * @param {object} attributes - block attributes.
 * @return {string} - data attribute with styles.
 */
const getCustomStylesAttr = ( data = {}, blockType, attributes ) => {
    let styles = getStyles( data );

    if ( blockType.ghostkit && blockType.ghostkit.customStylesFilter ) {
        styles = blockType.ghostkit.customStylesFilter( styles, data, false, attributes );
    }

    return {
        'data-ghostkit-styles': styles,
    };
};

/**
 * Extend block attributes with styles.
 *
 * @param {Object} blockSettings Original block settings.
 * @param {String} name Original block name.
 *
 * @return {Object} Filtered block settings.
 */
function addAttribute( blockSettings, name ) {
    let allow = false;

    // prepare settings of block + deprecated blocks.
    const eachSettings = [ blockSettings ];
    if ( blockSettings.deprecated && blockSettings.deprecated.length ) {
        blockSettings.deprecated.forEach( ( item ) => {
            eachSettings.push( item );
        } );
    }

    eachSettings.forEach( ( settings ) => {
        allow = false;

        if ( settings && settings.attributes ) {
            if ( GHOSTKIT.hasBlockSupport( settings || blockSettings, 'styles', false ) ) {
                allow = true;
            } else {
                allow = applyFilters(
                    'ghostkit.blocks.allowCustomStyles',
                    false,
                    settings,
                    settings.name || blockSettings.name
                );
            }
        }

        if ( allow ) {
            if ( ! settings.attributes.ghostkitStyles ) {
                settings.attributes.ghostkitStyles = {
                    type: 'object',
                    default: '',
                };

                // add to deprecated items.
                if ( settings.deprecated && settings.deprecated.length ) {
                    settings.deprecated.forEach( ( item, i ) => {
                        if ( settings.deprecated[ i ].attributes ) {
                            settings.deprecated[ i ].attributes.ghostkitStyles = settings.attributes.ghostkitStyles;
                        }
                    } );
                }
            }
            if ( ! settings.attributes.ghostkitClassname ) {
                settings.attributes.ghostkitClassname = {
                    type: 'string',
                    default: '',
                };

                // add to deprecated items.
                if ( settings.deprecated && settings.deprecated.length ) {
                    settings.deprecated.forEach( ( item, i ) => {
                        if ( settings.deprecated[ i ].attributes ) {
                            settings.deprecated[ i ].attributes.ghostkitClassname = settings.attributes.ghostkitClassname;
                        }
                    } );
                }
            }
            if ( ! settings.attributes.ghostkitId ) {
                settings.attributes.ghostkitId = {
                    type: 'string',
                    default: '',
                };

                // add to deprecated items.
                if ( settings.deprecated && settings.deprecated.length ) {
                    settings.deprecated.forEach( ( item, i ) => {
                        if ( settings.deprecated[ i ].attributes ) {
                            settings.deprecated[ i ].attributes.ghostkitId = settings.attributes.ghostkitId;
                        }
                    } );
                }
            }

            settings = applyFilters( 'ghostkit.blocks.withCustomStyles', settings, name );
        }
    } );

    return blockSettings;
}

/**
 * Extend block attributes with styles after block transformation
 *
 * @param {Object} transformedBlock Original transformed block.
 * @param {Object} blocks           Blocks on which transform was applied.
 *
 * @return {Object} Modified transformed block, with layout preserved.
 */
function addAttributeTransform( transformedBlock, blocks ) {
    if (
        blocks &&
        blocks[ 0 ] &&
        blocks[ 0 ].clientId === transformedBlock.clientId &&
        blocks[ 0 ].attributes &&
        blocks[ 0 ].attributes.ghostkitStyles &&
        Object.keys( blocks[ 0 ].attributes.ghostkitStyles ).length
    ) {
        Object.keys( blocks[ 0 ].attributes ).forEach( ( attrName ) => {
            if ( /^ghostkit/.test( attrName ) ) {
                transformedBlock.attributes[ attrName ] = blocks[ 0 ].attributes[ attrName ];
            }
        } );
    }

    return transformedBlock;
}

/**
 * Override the default edit UI to include a new block inspector control for
 * assigning the custom styles if needed.
 *
 * @param {function|Component} BlockEdit Original component.
 *
 * @return {string} Wrapped component.
 */
const withNewAttrs = createHigherOrderComponent( ( BlockEdit ) => {
    class newEdit extends Component {
        constructor() {
            super( ...arguments );

            this.onUpdate = this.onUpdate.bind( this );
            this.getGhostKitAtts = this.getGhostKitAtts.bind( this );
        }

        componentDidMount() {
            this.onUpdate( true );
        }
        componentDidUpdate() {
            this.onUpdate();
        }

        onUpdate( checkDuplicates ) {
            const {
                setAttributes,
                attributes,
                blockSettings,
            } = this.props;

            const newAttrs = {};

            // prepare custom block styles.
            const blockCustomStyles = applyFilters(
                'ghostkit.blocks.customStyles',
                blockSettings.ghostkit && blockSettings.ghostkit.customStylesCallback ? blockSettings.ghostkit.customStylesCallback( attributes, this.props ) : {},
                this.props
            );

            if ( blockCustomStyles && Object.keys( blockCustomStyles ).length ) {
                const ghostkitAtts = this.getGhostKitAtts( checkDuplicates );

                if ( ghostkitAtts.ghostkitClassname ) {
                    let updateAttrs = false;

                    let className = `.${ attributes.ghostkitClassname }`;

                    if ( blockSettings.ghostkit && blockSettings.ghostkit.customSelector ) {
                        className = blockSettings.ghostkit.customSelector( className, this.props );
                    }

                    newAttrs.ghostkitStyles = {
                        [ className ]: blockCustomStyles,
                    };

                    if ( ghostkitAtts.ghostkitClassname !== attributes.ghostkitClassname ) {
                        newAttrs.ghostkitClassname = ghostkitAtts.ghostkitClassname;
                        updateAttrs = true;
                    }
                    if ( ghostkitAtts.ghostkitId !== attributes.ghostkitId ) {
                        newAttrs.ghostkitId = ghostkitAtts.ghostkitId;
                        updateAttrs = true;
                    }

                    updateAttrs = updateAttrs || ! deepEqual( attributes.ghostkitStyles, newAttrs.ghostkitStyles );

                    if ( updateAttrs ) {
                        setAttributes( newAttrs );
                    }
                }
            } else if ( attributes.ghostkitStyles ) {
                setAttributes( {
                    ghostkitClassname: '',
                    ghostkitId: '',
                    ghostkitStyles: '',
                } );
            }
        }

        /**
         * Get recursive all blocks of the current page
         *
         * @param {boolean} blocks - block list
         *
         * @return {array} block list
         */
        getAllBlocks( blocks = false ) {
            let result = [];

            if ( ! blocks ) {
                blocks = wp.data.select( 'core/editor' ).getBlocks();
            }

            if ( ! blocks ) {
                return result;
            }

            blocks.forEach( ( data ) => {
                result.push( data );

                if ( data.innerBlocks && data.innerBlocks.length ) {
                    result = [
                        ...result,
                        ...this.getAllBlocks( data.innerBlocks ),
                    ];
                }
            } );

            return result;
        }

        getGhostKitAtts( checkDuplicates ) {
            const {
                attributes,
                clientId,
                name,
            } = this.props;

            let {
                ghostkitId,
                ghostkitClassname,
            } = attributes;

            // create block ID.
            if ( ! ghostkitId || checkDuplicates ) {
                const usedIds = {};

                // prevent unique ID duplication after block duplicated.
                if ( checkDuplicates ) {
                    const allBlocks = this.getAllBlocks();
                    allBlocks.forEach( ( data ) => {
                        if ( data.clientId && data.attributes && data.attributes.ghostkitId ) {
                            usedIds[ data.attributes.ghostkitId ] = data.clientId;

                            if ( data.clientId !== clientId && data.attributes.ghostkitId === ghostkitId ) {
                                ghostkitId = '';
                            }
                        }
                    } );
                }

                // prepare new block id.
                if ( clientId && ! ghostkitId && typeof ghostkitId !== 'undefined' ) {
                    let ID = ghostkitId || '';

                    // check if ID already exist.
                    let tryCount = 10;
                    while ( ! ID || ( typeof usedIds[ ID ] !== 'undefined' && usedIds[ ID ] !== clientId && tryCount > 0 ) ) {
                        ID = shorthash.unique( clientId );
                        tryCount--;
                    }

                    if ( ID && typeof usedIds[ ID ] === 'undefined' ) {
                        usedIds[ ID ] = clientId;
                    }

                    if ( ID !== ghostkitId ) {
                        ghostkitId = ID;
                        ghostkitClassname = name.replace( '/', '-' ) + '-' + ID;
                    }
                }
            }

            if ( ghostkitId && ghostkitClassname ) {
                return {
                    ghostkitId: ghostkitId,
                    ghostkitClassname: ghostkitClassname,
                };
            }

            return {};
        }

        render() {
            const {
                attributes,
                blockSettings,
            } = this.props;

            if ( attributes.ghostkitClassname && attributes.ghostkitStyles && Object.keys( attributes.ghostkitStyles ).length !== 0 ) {
                let styles = getStyles( attributes.ghostkitStyles, '', false );

                if ( blockSettings && blockSettings.ghostkit && blockSettings.ghostkit.customStylesFilter ) {
                    styles = blockSettings.ghostkit.customStylesFilter( styles, attributes.ghostkitStyles, true, attributes );
                }

                return (
                    <Fragment>
                        <BlockEdit { ...this.props } />
                        <style>{ window.GHOSTKIT.replaceVars( styles ) }</style>
                    </Fragment>
                );
            }

            return <BlockEdit { ...this.props } />;
        }
    }

    return withSelect( ( select, ownProps ) => {
        return {
            blockSettings: getBlockType( ownProps.name ),
        };
    } )( newEdit );
}, 'withNewAttrs' );

/**
 * Add block custom classname.
 *
 * @param {string} className block editor/save classname
 * @param {object} { attributes } - block attributes
 * @return {string} changed classname
 */
function blocksEditorCustomClassName( className, { attributes } ) {
    if ( attributes.ghostkitClassname ) {
        className = classnames( className, attributes.ghostkitClassname );
    }

    return className;
}

/**
 * Override props assigned to save component to inject custom styles.
 * This is only applied if the block's save result is an
 * element and not a markup string.
 *
 * @param {Object} extraProps Additional props applied to save element.
 * @param {Object} blockType  Block type.
 * @param {Object} attributes Current block attributes.
 *
 * @return {Object} Filtered props applied to save element.
 */
function addSaveProps( extraProps, blockType, attributes ) {
    const customStyles = attributes.ghostkitStyles ? Object.assign( {}, attributes.ghostkitStyles ) : false;

    if ( customStyles && Object.keys( customStyles ).length !== 0 ) {
        extraProps = Object.assign( extraProps || {}, getCustomStylesAttr( customStyles, blockType, attributes ) );
        extraProps.className = blocksEditorCustomClassName( extraProps.className, { attributes } );
    }

    return extraProps;
}

// Init filters.
addFilter( 'blocks.registerBlockType', 'ghostkit/styles/additional-attributes', addAttribute );
addFilter( 'blocks.switchToBlockType.transformedBlock', 'ghostkit/styles/additional-attributes', addAttributeTransform );
addFilter( 'editor.BlockEdit', 'ghostkit/styles/additional-attributes', withNewAttrs );
addFilter( 'blocks.getSaveContent.extraProps', 'ghostkit/styles/save-props', addSaveProps );
addFilter( 'ghostkit.editor.className', 'ghostkit/editor/custom-class-name', blocksEditorCustomClassName );
