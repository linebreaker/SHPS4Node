﻿'use strict';

var me = module.exports;

var q = require('q');
var promise = require('promise');

var helper = require('./helper.js');
var sql = require('./sql.js');

var mp = {
    self: this
};


/**
 * Grouphuggable
 * Breaks after 3 hugs per partner
 * 
 * @param $hug
 *  Huggable caller
 */
var _hug 
= me.hug = function f_log_hug($h) {
    
    return helper.genericHug($h, mp, function f_helper_log_hug($hugCount) {
        
        if ($hugCount > 3) {
            
            return false;
        }
        
        return true;
    });
};

/**
 * Get language to use
 * 
 * @param Object $requestState
 * @return string
 */
var _getLanguage 
= me.getLanguage = function f_language_getLanguage($requestState) {
    
    if (typeof $requestState.cache.language !== 'undefined') {
        
        return $requestState.cache.language;
    }
    else {

        var p = new Promise(function ($fulfill, $reject) {

            sql.newSQL('default', $requestState).then(function ($sql) {
                
                var tblLang = $sql.openTable('language');
                $sql.query()
                    .get([
                        tblLang.col('name'),
                    ])
                    .orderBy(tblLang.col('ID'))
                    .execute()
                    .then(function ($rows) {
                    
                    $sql.free();
                    var ll = _getAcceptLanguageList();
                    if ($rows.length <= 0) {

                        if (ll.length <= 0) {

                            $fulfill('en');
                        }
                        else {

                            $fulfill(ll[0][0]);
                        }
                    }
                    else {
                        
                        if (ll.length <= 0) {
                            
                            $fulfill($rows[0].name);
                        }
                        else {
                            
                            var i = 0;
                            var l = $rows.length;
                            var lll = ll.length;
                            var done = false;
                            while (i < lll && !done) {
                                
                                var j = 0;
                                while (j < l) {
                                    
                                    if ($rows[j].name === ll[i][0]) {

                                        $fulfill(ll[i][0]);
                                        done = true;
                                        break;
                                    }

                                    j++;
                                }

                                i++;
                            }

                            if (!done) {

                                $fulfill('en');
                            }
                        }
                    }
                }).done();
            }).done();
        });

        return p.then(function ($result) {
            
            $requestState.cache.language = $result;
            return $result;
        });
    }
};

var _getAcceptLanguageList
= me.getAcceptLanguageList = function f_language_getAcceptLanguageList($requestState) {

    if (typeof $requestState.cache.languages === 'undefined') {

        if (typeof $requestState.request.headers['accept-language'] === 'undefined') {
            
            $requestState.cache.languages = [];
        }
        else {
            
            var langs = $requestState.request.headers['accept-language'].split(',');
            var cleanArray = [];
            var keys = [];
            
            var updateQuality = function ($lang, $qual) {
                
                var i = 0;
                var l = cleanArray.length;
                while (i < l) {
                    
                    if (cleanArray[i][0] == $lang) {
                        
                        if (cleanArray[i][1] < $qual) {
                            
                            cleanArray[i][1] = $qual;
                        }
                        
                        break;
                    }
                    
                    i++;
                }
            };
            
            var i = 0;
            var l = langs.length;
            while (i < l) {
                
                var entry = langs[i].split(';');
                var lang = entry[0].substr(0, 2);
                var quality;
                if (entry.length == 1) {
                    
                    quality = 1;
                }
                else {
                    
                    quality = +entry[1].replace(/^q=/, ''); // + used to convert string to float
                }
                
                if (keys.indexOf(lang) < 0) {
                    
                    cleanArray.push([lang, quality]);
                    keys.push(lang);
                }
                else {
                    
                    updateQuality(lang, quality);
                }
                
                i++;
            }
            
            langs = cleanArray;
            langs = langs.sort(function ($a, $b) {
                
                return $b[1] - $a[1];
            });
            
            $requestState.cache.languages = langs;
        }
    }

    return $requestState.cache.languages;
}

/**
 * Get enumerator over languages
 * Languages are sorted by quality. Important languages come first.
 * 
 * @param Object $requestState
 * @return Object Enumerator with next() and currentLanguage and currentQuality
 */
var _getAcceptLanguageEnumerator 
= me.getAcceptLanguageEnumerator = function f_language_getAcceptLanguageEnumerator($requestState) {

    return {
        
        _langs: _getAcceptLanguageList($requestState),
        _index: -1,
        currentLanguage: '',
        currentQuality: 0,

        next: function () {
            
            this._index++;
            var r = this._index < this._langs.length;
            if (r) {

                this.currentLanguage = this._langs[this._index][0];
                this.currentQuality = this._langs[this._index][1];
            }

            return r;
        }
    };
};
