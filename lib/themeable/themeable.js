import { PropTypes } from 'react'
import ReactDOM from 'react-dom'
import { ThemeContextTypes, getThemeContext } from './ThemeContextTypes'
import shallowEqual from './util/shallowEqual'
import deepEqual from 'deep-equal'
import shortid from 'shortid'

import getDisplayName from './util/getDisplayName'
import applyVariablesToNode from './util/applyVariablesToNode'
import getCssText from './util/getCssText'

import {
  registerThemeGenerator,
  generateComponentTheme,
  setDefaultTheme,
  generateTheme
} from './registry'

import {
  mount,
  unmount
} from './styles'

/**
 * Mark component as themeable and inject component styles into the document
 *
 * Themeable components have a `theme` property which can be configured explicitly
 * via props or passed via context.
 *
 */
export default function themeable (theme, styles, disablePureRender) {
  return function (ComposedComponent) {
    const displayName = getDisplayName(ComposedComponent)

    const contextKey = Symbol(displayName)

    registerThemeGenerator(contextKey, theme)

    const getThemeFromContext = function (context) {
      const themeContext = getThemeContext(context)
      return (themeContext && themeContext.theme && themeContext.theme[contextKey]) || {}
    }

    class ThemeableComponent extends ComposedComponent {
      constructor (props, context) {
        super(props, context)

        this._themeCache = null

        const id = shortid.generate()

        this._themeId = (process.env.DEBUG) ? displayName + '__' + id : id
      }

      static displayName = displayName

      static theme = contextKey

      static contextTypes = {
        ...ComposedComponent.contextTypes,
        ...ThemeContextTypes
      }

      static propTypes = {
        ...ComposedComponent.propTypes,
        theme: PropTypes.object
      }

      static generateTheme = function (themeKey, overrides) {
        return generateComponentTheme(contextKey, themeKey, overrides)
      }

      componentWillMount () {
        const defaultTheme = generateComponentTheme(contextKey)
        const cssText = getCssText(styles, defaultTheme, displayName)

        mount(displayName, cssText)

        if (super.componentWillMount) {
          super.componentWillMount()
        }
      }

      componentDidMount () {
        this.applyTheme()

        if (super.componentDidMount) {
          super.componentDidMount()
        }
      }

      shouldComponentUpdate (nextProps, nextState, nextContext) {
        let shouldUpdate = true

        if (super.shouldComponentUpdate) {
          shouldUpdate = super.shouldComponentUpdate(nextProps, nextState, nextContext)
        }

        if (disablePureRender) {
          return shouldUpdate
        } else {
          return !(shallowEqual(this.props, nextProps) &&
            shallowEqual(this.state, nextState) &&
            shallowEqual(this.context, nextContext) &&
            compareThemeContext(this.context, nextContext)
          )
        }
      }

      componentWillUpdate (nextProps, nextState, nextContext) {
        if (!shallowEqual(nextProps.theme, this.props.theme) ||
          !shallowEqual(getThemeFromContext(nextContext), getThemeFromContext(this.context))) {
          this._themeCache = null
        }

        if (super.componentWillUpdate) {
          super.componentWillUpdate(nextProps, nextState, nextContext)
        }
      }

      componentDidUpdate (prevProps, prevState, prevContext) {
        if (!shallowEqual(prevProps.theme, this.props.theme) ||
          !shallowEqual(getThemeFromContext(prevContext), getThemeFromContext(this.context))) {
          this.applyTheme()
        }

        if (super.componentDidUpdate) {
          super.componentDidUpdate(prevProps, prevState, prevContext)
        }
      }

      componentWillUnmount () {
        unmount(displayName)

        if (super.componentWillUnmount) {
          super.componentWillUnmount()
        }
      }

      applyTheme () {
        const defaultTheme = generateComponentTheme(contextKey)

        applyVariablesToNode(
          ReactDOM.findDOMNode(this),
          this.theme,
          defaultTheme,
          displayName,
          styles, // for IE
          this._themeId // for IE
        )
      }

      get theme () {
        const defaultTheme = generateComponentTheme(contextKey)

        if (this._themeCache !== null) {
          return this._themeCache
        }

        let theme = getThemeFromContext(this.context)

        if (this.props.theme) {
          theme = {...theme, ...this.props.theme}
        }

        if (defaultTheme) {
          theme = {...defaultTheme, ...theme}
        }

        this._themeCache = theme

        return theme
      }
    }

    return ThemeableComponent
  }
}

/**
*  Utility to generate a theme for all themeable components
*/
themeable.generateTheme = generateTheme

/**
*  the default theme is what's injected into the style tags
*  everything else is applied scoped to the root dom node of the component
*  via css variables or scoped styles (for IE and Edge)
*
*  Use this to override the built-in default theme & set a global default theme for all themeable components
*/
themeable.setDefaultTheme = setDefaultTheme

function compareThemeContext (context, nextContext) {
  const themeContext = getThemeContext(context)
  if (themeContext) {
    return deepEqual(themeContext, getThemeContext(nextContext))
  } else {
    return true
  }
}
