'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var path = require('path');
var chokidar = _interopDefault(require('chokidar'));
var bodyParser = _interopDefault(require('body-parser'));
var assert = _interopDefault(require('assert'));
var pathToRegexp = _interopDefault(require('path-to-regexp'));
var glob = _interopDefault(require('glob'));

function matchMock(req, mockData) {
    var origionMethod = req.method, targetPath = req.path;
    var targetMethod = origionMethod.toLowerCase();
    for (var _i = 0, mockData_1 = mockData; _i < mockData_1.length; _i++) {
        var mock = mockData_1[_i];
        var method = mock.method, re = mock.re, keys = mock.keys;
        if (method === targetMethod) {
            var match = re.exec(targetPath);
            if (match) {
                var params = {};
                for (var i = 1; i < match.length; i += 1) {
                    var key = keys[i - 1];
                    var prop = key.name;
                    var val = decodeParam(match[i]);
                    if (val !== undefined || !Object.prototype.hasOwnProperty.call(params, prop)) {
                        params[prop] = val;
                    }
                }
                req.params = params;
                return mock;
            }
        }
    }
}
function decodeParam(val) {
    if (typeof val !== 'string' || val.length === 0) {
        return val;
    }
    try {
        return decodeURIComponent(val);
    }
    catch (err) {
        if (err instanceof URIError) {
            err.message = "Failed to decode param ' " + val + " '";
            // @ts-ignore
            err.status = 400;
            // @ts-ignore
            err.statusCode = 400;
        }
        throw err;
    }
}

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

var debug = require('debug')('quick-mock:getMockData');
var VALID_METHODS = ['get', 'post', 'put', 'patch', 'delete'];
var BODY_PARSED_METHODS = ['post', 'put', 'patch', 'delete'];
function createHandler(method, path, handler) {
    return function (req, res, next) {
        if (BODY_PARSED_METHODS.includes(method)) {
            bodyParser.json({ limit: '5mb', strict: false })(req, res, function () {
                bodyParser.urlencoded({ limit: '5mb', extended: true })(req, res, function () {
                    sendData();
                });
            });
        }
        else {
            sendData();
        }
        function sendData() {
            if (typeof handler === 'function') {
                handler(req, res, next);
            }
            else {
                res.json(handler);
            }
        }
    };
}
function parseKey(key) {
    var method = 'get';
    var path = key;
    if (/\s+/.test(key)) {
        var splited = key.split(/\s+/);
        method = splited[0].toLowerCase();
        path = splited[1]; // eslint-disable-line
    }
    assert(VALID_METHODS.includes(method), "Invalid method " + method + " for path " + path + ", please check your mock files.");
    return {
        method: method,
        path: path
    };
}
function normalizeConfig(config) {
    return Object.keys(config).reduce(function (memo, key) {
        var handler = config[key];
        var type = typeof handler;
        assert(type === 'function' || type === 'object', "mock value of " + key + " should be function or object, but got " + type);
        var _a = parseKey(key), method = _a.method, path = _a.path;
        var keys = [];
        var re = pathToRegexp(path, keys);
        memo.push({
            method: method,
            path: path,
            re: re,
            keys: keys,
            handler: createHandler(method, path, handler)
        });
        return memo;
    }, []);
}
function getMockConfigFromFiles(files) {
    return files.reduce(function (memo, mockFile) {
        try {
            var m = require(mockFile); // eslint-disable-line
            memo = __assign({}, memo, (m["default"] || m));
            return memo;
        }
        catch (e) {
            throw new Error(e.stack);
        }
    }, {});
}
function getMockFiles(opts) {
    var cwd = opts.cwd;
    var mockFiles = glob
        .sync('mock/**/*.[jt]s', {
        cwd: cwd
    })
        .map(function (p) { return path.join(cwd, p); });
    debug("load mock data from mock folder, including files " + JSON.stringify(mockFiles));
    return mockFiles;
}
function getMockConfig(opts) {
    var files = getMockFiles(opts);
    debug("mock files: " + files.join(', '));
    return getMockConfigFromFiles(files);
}
function getMockData (opts) {
    try {
        return normalizeConfig(getMockConfig(opts));
    }
    catch (e) {
        console.error('Mock files parse failed');
    }
}

var debug$1 = require('debug')('quick-mock:createMiddleware');
function createMiddleware(options) {
    if (options === void 0) { options = {}; }
    var _a = options.cwd, cwd = _a === void 0 ? process.cwd() : _a, _b = options.watch, watch = _b === void 0 ? true : _b;
    var mockData = null;
    var paths = [path.join(cwd, 'mock')];
    function fetchMockData() {
        mockData = getMockData({
            cwd: cwd
        });
    }
    function cleanRequireCache() {
        Object.keys(require.cache).forEach(function (file) {
            if (paths.some(function (path) {
                return file.indexOf(path) > -1;
            })) {
                delete require.cache[file];
            }
        });
    }
    fetchMockData();
    if (watch) {
        var watcher = chokidar.watch(paths, {
            ignoreInitial: true
        });
        watcher.on('all', function (event, file) {
            debug$1("[" + event + "] " + file + ", reload mock data");
            cleanRequireCache();
            fetchMockData();
        });
    }
    return function mockMiddleware(req, res, next) {
        // debug('req', req && req.path, debug.enabled, debug.namespace, process.env.DEBUG)
        var match = mockData && matchMock(req, mockData);
        if (match) {
            debug$1("mock matched: [" + match.method + "] " + match.path);
            return match.handler(req, res, next);
        }
        else {
            return next();
        }
    };
}

module.exports = createMiddleware;
