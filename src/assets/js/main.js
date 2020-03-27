/**
 * External dependencies
 */
import { throttle } from 'throttle-debounce';
import rafl from 'rafl';

/**
 * Internal dependencies
 */
import parseSRConfig from '../../gutenberg/extend/scroll-reveal/parseSRConfig';

const $ = window.jQuery;

const $wnd = $( window );

const $doc = $( document );

const {
    ghostkitVariables,
    GHOSTKIT,
} = window;

/**
 * Throttle scroll
 */
const throttleScrollList = [];
let lastST = 0;

const hasScrolled = () => {
    const body = document.body;
    const html = document.documentElement;
    const ST = window.pageYOffset || html.scrollTop;

    let type = ''; // [up, down, end, start]

    if ( ST > lastST ) {
        type = 'down';
    } else if ( ST < lastST ) {
        type = 'up';
    } else {
        type = 'none';
    }

    const docH = Math.max( body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight );
    const wndH = window.innerHeight || html.clientHeight || body.clientHeight;

    if ( ST === 0 ) {
        type = 'start';
    } else if ( ST >= docH - wndH ) {
        type = 'end';
    }

    throttleScrollList.forEach( ( value ) => {
        if ( typeof value === 'function' ) {
            value( type, ST, lastST );
        }
    } );

    lastST = ST;
};

const hasScrolledThrottle = throttle( 200, () => {
    if ( throttleScrollList.length ) {
        rafl( hasScrolled );
    }
} );

$wnd.on( 'scroll load resize orientationchange throttlescroll.ghostkit', hasScrolledThrottle );
$doc.on( 'ready', hasScrolledThrottle );

function throttleScroll( callback ) {
    throttleScrollList.push( callback );
}

class GhostKitClass {
    constructor() {
        const self = this;

        self.isMobile = /Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/g.test( window.navigator.userAgent || window.navigator.vendor || window.opera );

        // prepare media vars.
        self.screenSizes = [];
        Object.keys( ghostkitVariables.media_sizes ).forEach( ( k ) => {
            self.screenSizes.push( ghostkitVariables.media_sizes[ k ] );
        } );

        self.customStyles = $( '#ghostkit-blocks-custom-css-inline-css' ).html() || '';

        // Methods bind class.
        self.hasScrolled = self.hasScrolled.bind( self );
        self.throttleScroll = self.throttleScroll.bind( self );
        self.initBlocks = self.initBlocks.bind( self );
        self.getWnd = self.getWnd.bind( self );
        self.isElementInViewport = self.isElementInViewport.bind( self );
        self.prepareCounters = self.prepareCounters.bind( self );
        self.prepareFallbackCustomStyles = self.prepareFallbackCustomStyles.bind( self );
        self.prepareSR = self.prepareSR.bind( self );

        GHOSTKIT.triggerEvent( 'beforeInit', self );

        // Enable object-fit.
        if ( typeof window.objectFitImages !== 'undefined' ) {
            const ofiImages = '.ghostkit-video-poster img, .ghostkit-grid > .nk-awb img, .ghostkit-col > .nk-awb img';

            window.objectFitImages( ofiImages );
            $doc.on( 'ready', () => {
                window.objectFitImages( ofiImages );
            } );
        }

        // Additional easing.
        $.extend( $.easing, {
            easeOutCubic( x, t, b, c, d ) {
                return ( c * ( ( ( t = ( t / d ) - 1 ) * t * t ) + 1 ) ) + b;
            },
        } );

        // Alerts dismiss button.
        $( document ).on( 'click', '.ghostkit-alert-hide-button', function( e ) {
            e.preventDefault();
            $( this ).parent()
                .animate( { opacity: 0 }, 150, function() {
                    $( this ).slideUp( 200 );

                    hasScrolled();
                } );
        } );

        // Init blocks.
        const throttledInitBlocks = throttle( 200, () => {
            rafl( () => {
                self.initBlocks();
            } );
        } );
        if ( window.MutationObserver ) {
            new window.MutationObserver( throttledInitBlocks )
                .observe( document.documentElement, {
                    childList: true, subtree: true,
                } );
        } else {
            $( document ).on( 'DOMContentLoaded DOMNodeInserted load', () => {
                throttledInitBlocks();
            } );
        }

        GHOSTKIT.triggerEvent( 'afterInit', self );
    }

    // has scrolled
    hasScrolled() {
        hasScrolled();
    }

    // throttle scroll
    throttleScroll( callback ) {
        throttleScroll( callback );
    }

    // Init blocks.
    initBlocks() {
        const self = this;

        GHOSTKIT.triggerEvent( 'beforeInitBlocks', self );

        GHOSTKIT.triggerEvent( 'initBlocks', self );

        self.prepareFallbackCustomStyles();
        self.prepareCounters();
        self.prepareSR();

        GHOSTKIT.triggerEvent( 'afterInitBlocks', self );
    }

    // Get window size.
    getWnd() {
        // eslint-disable-next-line
        console.warn( 'GHOSTKIT.getWnd method is deprecated since v2.9.0 and will be removed in future updates. Please, use `window.innerWidth` and `window.innerHeight`' );

        return {
            w: window.innerWidth,
            h: window.innerHeight,
        };
    }

    /**
     * Is element in viewport.
     * https://stackoverflow.com/questions/123999/how-to-tell-if-a-dom-element-is-visible-in-the-current-viewport/7557433#7557433
     *
     * @param {DOM} el - element.
     * @param {Number} allowPercent - visible percent of the element.
     *
     * @returns {Boolean} - visible.
     */
    isElementInViewport( el, allowPercent = 1 ) {
        const rect = el.getBoundingClientRect();
        const rectW = rect.width || 1;
        const rectH = rect.height || 1;
        let visibleHeight = 0;
        let visibleWidth = 0;

        // on top of viewport
        if ( rect.top < 0 && rectH + rect.top > 0 ) {
            visibleHeight = rectH + rect.top;

        // on bot of viewport.
        } else if ( rect.top > 0 && rect.top < window.innerHeight ) {
            visibleHeight = window.innerHeight - rect.top;
        }

        // on left of viewport
        if ( rect.left < 0 && rectW + rect.left > 0 ) {
            visibleWidth = rectW + rect.left;

        // on bot of viewport.
        } else if ( window.innerWidth - rect.left > 0 ) {
            visibleWidth = window.innerWidth - rect.left;
        }

        visibleHeight = Math.min( visibleHeight, rectH );
        visibleWidth = Math.min( visibleWidth, rectW );

        const visiblePercent = visibleWidth * visibleHeight / ( rectW * rectH );

        return visiblePercent >= allowPercent;
    }

    /**
     * Prepare Counters (Number Box, Progress Bar)
     */
    prepareCounters() {
        const self = this;

        GHOSTKIT.triggerEvent( 'beforePrepareCounters', self );

        $( '.ghostkit-count-up:not(.ghostkit-count-up-ready)' ).each( function() {
            const $this = $( this );
            const isProgress = $this.hasClass( 'ghostkit-progress-bar' );
            const from = parseFloat( $this.attr( 'data-count-from' ) ) || 0;
            const to = parseFloat( isProgress ? $this.attr( 'aria-valuenow' ) : $this.text() ) || 0;
            let $progressCountBadgeWrap;
            let $progressCountBadge;

            // prepare mask.
            let mask = '';
            if ( ! isProgress ) {
                mask = $this.text().replace( to, '${val}' );
            }
            if ( ! /\${val}/.test( mask ) ) {
                mask = '${val}';
            }

            $this.addClass( 'ghostkit-count-up-ready' );

            if ( isProgress ) {
                $progressCountBadgeWrap = $this.closest( '.ghostkit-progress' ).find( '.ghostkit-progress-bar-count' );
                $progressCountBadge = $progressCountBadgeWrap.find( '> div > span:eq(1)' );

                $progressCountBadgeWrap.css( 'width', '0%' );
                $progressCountBadge.text( '0' );
                $this.css( 'width', '0%' );
            } else {
                $this.text( mask.replace( '${val}', from ) );
            }

            const item = {
                el: this,
                from: from,
                to: to,
                cb( num ) {
                    if ( isProgress ) {
                        $this.css( 'width', `${ Math.ceil( num * 100 ) / 100 }%` );
                        $progressCountBadgeWrap.css( 'width', `${ Math.ceil( num * 100 ) / 100 }%` );

                        $progressCountBadge.text( Math.ceil( num ) );
                    } else {
                        $this.text( mask.replace( '${val}', Math.ceil( num ) ) );
                    }
                },
            };
            let showed = false;

            // Run counter.
            throttleScroll( () => {
                if ( ! showed && item && self.isElementInViewport( item.el ) ) {
                    showed = true;
                    $( { Counter: item.from } ).animate( { Counter: item.to }, {
                        duration: 1000,
                        easing: 'easeOutCubic',
                        step() {
                            item.cb( this.Counter, false );
                        },
                        complete() {
                            item.cb( item.to, true );
                        },
                    } );
                }
            } );
        } );

        GHOSTKIT.triggerEvent( 'afterPrepareCounters', self );
    }

    /**
     * Prepare custom styles.
     * This method used as Fallback only.
     * Since plugin version 2.6.0 we use PHP styles render.
     */
    prepareFallbackCustomStyles() {
        const self = this;
        let reloadStyles = false;

        GHOSTKIT.triggerEvent( 'beforePrepareCustomStyles', self );

        $( '[data-ghostkit-styles]' ).each( function() {
            const $this = $( this );
            self.customStyles += GHOSTKIT.replaceVars( $this.attr( 'data-ghostkit-styles' ) );
            $this.removeAttr( 'data-ghostkit-styles' );
            reloadStyles = true;
        } );

        if ( reloadStyles ) {
            let $style = $( '#ghostkit-blocks-custom-css-inline-css' );
            if ( ! $style.length ) {
                $style = $( '<style id="ghostkit-blocks-custom-css-inline-css">' ).appendTo( 'head' );
            }
            $style.html( self.customStyles );
        }

        GHOSTKIT.triggerEvent( 'afterPrepareCustomStyles', self );
    }

    /**
     * Prepare ScrollReveal
     */
    prepareSR() {
        const self = this;

        if ( ! window.ScrollReveal ) {
            return;
        }

        const {
            reveal,
        } = window.ScrollReveal();

        GHOSTKIT.triggerEvent( 'beforePrepareSR', self );

        $( '[data-ghostkit-sr]:not(.data-ghostkit-sr-ready)' ).each( function() {
            const $element = $( this );

            GHOSTKIT.triggerEvent( 'beforePrepareSRStart', self, $element );

            $element.addClass( 'data-ghostkit-sr-ready' );

            const data = $element.attr( 'data-ghostkit-sr' );
            const config = parseSRConfig( data );

            config.afterReveal = () => {
                $element.removeAttr( 'data-ghostkit-sr' );
                $element.removeClass( 'data-ghostkit-sr-ready' );
            };

            GHOSTKIT.triggerEvent( 'beforeInitSR', self, $element, config );

            reveal( this, config );

            GHOSTKIT.triggerEvent( 'beforePrepareSREnd', self, $element );
        } );

        GHOSTKIT.triggerEvent( 'afterPrepareSR', self );
    }
}

GHOSTKIT.classObject = new GhostKitClass();