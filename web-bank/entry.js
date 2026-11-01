/* 浏览器入口：把内核挂到 window.KB */
var KB = window.KB = window.KB || {};

KB.RNG = require('../core/rng.js');
KB.Schema = require('../core/schema.js');
KB.Registry = require('../core/registry.js');
KB.Generators = require('../generators/index.js');
KB.Paper = require('../core/paper.js');

KB.version = window.KB_BUILD ? window.KB_BUILD.version : 'dev';
KB.ready = true;
