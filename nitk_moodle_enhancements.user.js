// ==UserScript==
// @name         nitk moodle enhancements
// @namespace    https://lectures.iris.nitk.ac.in
// @version      0.1
// @description  some bug fixes and enhancements for nitk moodle platform
// @author       roy
// @match        https://lectures.iris.nitk.ac.in/playback/*
// @grant        GM_setValue
// @grant        GM_getValue
// @downloadURL  https://github.com/syfluqs/nitk_moodle_enhancements/raw/main/nitk_moodle_enhancements.user.js
// ==/UserScript==

(function() {
    'use strict';
    var observeDOM = (function(){
        var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

        return function( obj, callback ){
            if( !obj || obj.nodeType !== 1 ) return;

            if( MutationObserver ){
                // define a new observer
                var mutationObserver = new MutationObserver(callback)

                // have the observer observe foo for changes in children
                mutationObserver.observe( obj, { childList:true, subtree:true })
                return mutationObserver
            }

            // browser support fallback
            else if( window.addEventListener ){
                obj.addEventListener('DOMNodeInserted', callback, false)
                obj.addEventListener('DOMNodeRemoved', callback, false)
            }
        }
    })();

    let side_section = document.getElementById('side-section');
    observeDOM(side_section, (m) => {
        m.forEach(record => {
            record.addedNodes.forEach(node => {
                if (node.className === 'acorn-controls') {
                    init(node);
                }
            })
        });
    });

    function init(node) {
        console.log('=== enhancing moodle ===');
        let play_button = node.getElementsByClassName('acorn-play-button')[0];
        let main_section = document.getElementById('main-section');
        function play_pause() {
            play_button.click();
        }
        main_section.addEventListener('click', play_pause);
        // expand by default
        let expand_button = node.getElementsByClassName('acorn-expand-button')[0];
        expand_button.click();
        // syncing audio video on playback speed change
        // restoring previous playback rate
        let playback_rate = parseFloat(GM_getValue('nitk_noodle_playback_rate')) || 1.0;
        console.log(playback_rate);
        let vid_elem = document.getElementById('deskshare-video');
        let aud_elem = document.getElementById('video');
        let speed_button = node.getElementsByClassName('acorn-speed-button')[0];
        function change_playback_speed(change_amount) {
            playback_rate += change_amount;
            vid_elem.playbackRate = playback_rate;
            aud_elem.playbackRate = playback_rate;
            GM_setValue('nitk_noodle_playback_rate', playback_rate);
            speed_button.innerHTML = playback_rate.toFixed(2);
        }
        // applying previous playback speed
        change_playback_speed(0);
        // hooking up speed button with new logic
        let new_speed_button = speed_button.cloneNode(true);
        speed_button.parentNode.replaceChild(new_speed_button, speed_button);
        speed_button = new_speed_button;
        speed_button.addEventListener('click', () => {
            if (playback_rate > 2) {
                playback_rate = 1;
            } else {
                playback_rate += 0.25;
            }
            change_playback_speed(0);
        });
        // hook key presses
        document.body.onkeyup = function(e){
            if(e.key == ' '){
                play_pause();
            } else if (e.key == '+') {
                change_playback_speed(0.1);
            } else if (e.key == '-') {
                change_playback_speed(-0.1);
            }
        }
    }
})();