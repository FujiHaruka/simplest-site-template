#!/usr/bin/env node

const fs = require('fs')
const { join } = require('path')
const co = require('co')
const mkdirp = require('mkdirp')
const Handlebars = require('handlebars')
const mdToHtml = require('./helpers/md-to-html.js')
const loc = require('../src/info/loc.json')
const ARTICLE_PATH = 'src/articles'
const INDEX_TEMPLATE_PATH = 'src/templates/index.html.hbs'
const ARTICLE_TEMPLATE_PATH = 'src/templates/article.html.hbs'
const DIST_DIR = 'public'

process.chdir(join(__dirname, '..'))

co(function * () {
  mkdirp.sync(DIST_DIR)

  let articleFiles = fs.readdirSync(ARTICLE_PATH)

  // Markdown articles to HTML
  let articles = yield articleFiles.map(file => co(function * () {
    let html = yield mdToHtml(join(ARTICLE_PATH, file))
    let fileName = file.split('.')[0] + '.html'
    // title は最初にヒットする h1 要素である
    let title = html.match(/<h1 id=".+">(.+)<\/h1>/)[1]
    return {
      html,
      fileName,
      title
    }
  }))

  // template to html
  let articleHbs = fs.readFileSync(ARTICLE_TEMPLATE_PATH, { encoding: 'utf-8' })
  let articleTmpl = Handlebars.compile(articleHbs)
  let pages = articles.reduce((pageObj, article, i) => {
    let {title, html, fileName} = article
    let data = {
      title,
      loc,
      article: html,
      next: articles[i + 1]
    }
    return Object.assign(pageObj, {
      [fileName]: articleTmpl(data)
    })
  }, {})
  // write in dist
  articles.forEach(({ fileName }) => {
    fs.writeFileSync(join(DIST_DIR, fileName), pages[fileName])
  })

  // Index page
  let indexHbs = fs.readFileSync(INDEX_TEMPLATE_PATH, { encoding: 'utf-8' })
  let indexTmpl = Handlebars.compile(indexHbs)
  let indexPage = indexTmpl({
    loc,
    nav: articles
  })
  fs.writeFileSync(join(DIST_DIR, 'index.html'), indexPage)
}).catch(err => console.error(err))
