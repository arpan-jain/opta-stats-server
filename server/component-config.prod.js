'use strict'

module.exports = {
  'loopback-component-explorer': (process
  && process.env
  && process.env.LOCAL
  && process.env.LOCAL == 1) ? {mountPath: '/explorer'} : {mountPath: '/explorer'}

