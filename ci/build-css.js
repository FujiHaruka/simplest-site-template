#!/usr/bin/env node
const fs = require('fs')
const { execSync } = require('child_process')
const { join } = require('path')
const mkdirp = require('mkdirp')
const co = require('co')
const compiler = require('node-sass')
const autoprefixer = require('autoprefixer')
const postcss = require('postcss')
const STYLE_PATH = 'src/stylesheets'
const DIST_DIR = 'public/css'

process.chdir(join(__dirname, '..'))

co(function * () {
  mkdirp.sync(DIST_DIR)
  execSync('cp node_modules/spectre.css/dist/spectre.min.css public/css/')

  let styleNames = fs.readdirSync(STYLE_PATH)
  let scssList = styleNames.map(file => {
    let scss = fs.readFileSync(join(STYLE_PATH, file)).toString()
    return scss
  })

  let cssNames = styleNames.map(file => file.split('.')[0] + '.css')
  let cssList = yield scssList.map(scss => co(function * () {
    return yield compile(scss)
  }))

  for (let i = 0; i < cssNames.length; i++) {
    fs.writeFileSync(join(DIST_DIR, cssNames[i]), cssList[i])
  }
}).catch(err => console.error(err))

/**
 * scss to css
 */
function compile (scss) {
  return co(function * () {
    let { css } = yield new Promise((resolve, reject) =>
      compiler.render({ data: scss }, (err, result) =>
        err ? reject(err) : resolve(result)
      )
    )
    let prefixedCss = yield postcss([ autoprefixer ]).process(css.toString())
    return prefixedCss.css
  })
}
