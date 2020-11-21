// ==UserScript==
// @name         nitk moodle enhancements
// @namespace    https://lectures.iris.nitk.ac.in
// @version      0.2
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
        let localstorage = window.localStorage;
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
        let vid_elem = document.getElementById('deskshare-video');
        let aud_elem = document.getElementById('video');
        let speed_button = node.getElementsByClassName('acorn-speed-button')[0];
        let sidebar_button = document.getElementsByClassName('sidebar-icon')[0];
        let exit_overlay = document.getElementsByClassName('exit-off-canvas')[0];
        let playback_timer = document.getElementsByClassName('acorn-timer')[0];

        let video_id = (new URL(window.location)).searchParams.get('meetingId');

        function change_playback_speed(change_amount) {
            if (vid_elem === null) {
                // slides interface, no video element
                // just change speed using built in logic
                speed_button.click();
                return;
            }
            playback_rate += change_amount;
            vid_elem.playbackRate = playback_rate;
            aud_elem.playbackRate = playback_rate;
            GM_setValue('nitk_noodle_playback_rate', playback_rate);
            speed_button.innerHTML = playback_rate.toFixed(2);
        }

        function store_playback_time(id_key) {
            let current_playback_time = aud_elem.currentTime;
            // only store if current playback time is greater than 5 seconds
            if (current_playback_time > 5) {
                localstorage.setItem(`moodle_last_time_${id_key}`, current_playback_time);
            }
        }

        function resume_playback(id_key) {
            let currurl = new URL(window.location);
            let url_time = currurl.searchParams.get('t');
            let last_playback_time = localstorage.getItem(`moodle_last_time_${id_key}`);
            if (last_playback_time && (url_time === null)) {
                aud_elem.currentTime = parseFloat(last_playback_time);
            }
        }

        let resume_playback_timer = setInterval(() => {
            if (videoReady) {
                resume_playback(video_id);
                clearInterval(resume_playback_timer);
            }
        }, 500);
        // save the current video playback time every 5 seconds
        setInterval(() => { store_playback_time(video_id); }, 5000);

        if (vid_elem !== null){
            // only hook if vid element present
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
            // applying previous playback speed
            change_playback_speed(0);
        } else {
            // show slides sidebar
            exit_overlay.remove();
            // sidebar_button.click();
        }


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