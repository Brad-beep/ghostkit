/**
 * WordPress dependencies
 */
/**
 * Internal dependencies
 */
import IconPicker from '../../components/icon-picker';

import metadata from './block.json';

const {
    applyFilters,
} = wp.hooks;

const { Component } = wp.element;

const {
    InnerBlocks,
} = wp.blockEditor;

const { name } = metadata;

export default [
    // v2.15.0
    {
        ...metadata,
        save: class BlockSave extends Component {
            render() {
                const {
                    icon,
                    hideButton,
                } = this.props.attributes;

                let className = 'ghostkit-alert';

                className = applyFilters( 'ghostkit.blocks.className', className, {
                    ...{
                        name,
                    },
                    ...this.props,
                } );

                return (
                    <div className={ className }>
                        { icon ? (
                            <IconPicker.Render
                                name={ icon }
                                tag="div"
                                className="ghostkit-alert-icon"
                            />
                        ) : '' }
                        <div className="ghostkit-alert-content">
                            <InnerBlocks.Content />
                        </div>
                        { hideButton ? (
                            <div className="ghostkit-alert-hide-button">
                                <svg className="ghostkit-svg-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M6.21967 6.21967C6.51256 5.92678 6.98744 5.92678 7.28033 6.21967L12 10.9393L16.7197 6.21967C17.0126 5.92678 17.4874 5.92678 17.7803 6.21967C18.0732 6.51256 18.0732 6.98744 17.7803 7.28033L13.0607 12L17.7803 16.7197C18.0732 17.0126 18.0732 17.4874 17.7803 17.7803C17.4874 18.0732 17.0126 18.0732 16.7197 17.7803L12 13.0607L7.28033 17.7803C6.98744 18.0732 6.51256 18.0732 6.21967 17.7803C5.92678 17.4874 5.92678 17.0126 6.21967 16.7197L10.9393 12L6.21967 7.28033C5.92678 6.98744 5.92678 6.51256 6.21967 6.21967Z" fill="currentColor" /></svg>
                            </div>
                        ) : '' }
                    </div>
                );
            }
        },
    },
];
