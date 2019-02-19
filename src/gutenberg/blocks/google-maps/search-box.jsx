import { compose, withState, withProps, withHandlers } from 'recompose';
import { withScriptjs } from 'react-google-maps';
const { StandaloneSearchBox } = require( 'react-google-maps/lib/components/places/StandaloneSearchBox' );

const {
    TextControl,
} = wp.components;

const SearchBox = compose(
    withState( 'value', 'setValue', props => {
        return props.value;
    } ),
    withProps( {
        loadingElement: <div />,
        containerElement: <div />,
    } ),
    withHandlers( () => {
        const refs = {
            searchBox: undefined,
        };

        return {
            onSearchBoxMounted: () => ref => {
                refs.searchBox = ref;
            },
            onPlacesChanged: ( props ) => () => {
                const places = refs.searchBox.getPlaces();

                if ( props.onChange ) {
                    props.onChange( places );

                    if ( places && places[ 0 ] ) {
                        props.setValue( places[ 0 ].formatted_address );
                    }
                }
            },
        };
    } ),
    withScriptjs,
)( props => {
    return (
        <div data-standalone-searchbox="" className={ props.className }>
            <StandaloneSearchBox
                ref={ props.onSearchBoxMounted }
                bounds={ props.bounds }
                onPlacesChanged={ props.onPlacesChanged }
            >
                <TextControl
                    label={ props.label }
                    placeholder={ props.placeholder }
                    value={ props.value }
                    onChange={ ( val ) => {
                        props.setValue( val );
                    } }
                />
            </StandaloneSearchBox>
        </div>
    );
} );

export default SearchBox;
