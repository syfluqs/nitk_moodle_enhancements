// ==UserScript==
// @name         nitk moodle enhancements
// @namespace    https://lectures.iris.nitk.ac.in
// @version      0.95
// @description  some bug fixes and enhancements for nitk moodle platform
// @author       roy
// @match        https://lectures.iris.nitk.ac.in/playback/*
// @match        https://courses.iris.nitk.ac.in/*
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

    let current_location = window.location;

    if (current_location.origin === 'https://lectures.iris.nitk.ac.in') {
        // lecture video player
        let side_section = document.getElementById('side-section');
        observeDOM(side_section, (m) => {
            m.forEach(record => {
                record.addedNodes.forEach(node => {
                    if (node.className === 'acorn-controls') {
                        enhance_lecture_player(node);
                    }
                })
            });
        });

        function enhance_lecture_player(node) {
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
                playback_rate += change_amount;
                if (vid_elem === null) {
                    // slides interface, no video element
                    // just change speed using built in logic
                    $("#video")[0].playbackRate = playback_rate;
                } else {
                    vid_elem.playbackRate = playback_rate;
                    aud_elem.playbackRate = playback_rate;
                }
                GM_setValue('nitk_noodle_playback_rate', playback_rate);
                speed_button.innerHTML = playback_rate.toFixed(2);
            }

            function store_playback_time(id_key) {
                let current_playback_time = aud_elem.currentTime;
                // only store if current playback time is greater than 5 seconds
                if (current_playback_time > 5) {
                    GM_setValue(`moodle_last_time_${id_key}`, current_playback_time);
                }
            }

            function resume_playback(id_key) {
                let currurl = new URL(window.location);
                let url_time = currurl.searchParams.get('t');
                let last_playback_time = GM_getValue(`moodle_last_time_${id_key}`);
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

            // detect when video ends and mark that video as completed
            aud_elem.addEventListener('ended', (e) => {
                GM_setValue(`moodle_last_time_${video_id}`, 0, false);
            });

            // remove the seek bar handle
            Array.from(document.getElementsByClassName('ui-slider-handle')).forEach((n) => {
                n.parentElement.removeChild(n);
            });

            // hook key presses
            document.body.onkeydown = function(e){
                switch(e.key) {
                    case ' ': play_pause(); e.preventDefault(); break;
                    case '+': change_playback_speed(0.1); e.preventDefault(); break;
                    case '-': change_playback_speed(-0.1); e.preventDefault(); break;
                    case 'ArrowLeft': {
                        if (e.ctrlKey) {
                            aud_elem.currentTime -= 300;
                        } else if (e.shiftKey) {
                            aud_elem.currentTime -= 60;
                        } else {
                            aud_elem.currentTime -= 5;
                        }
                        e.preventDefault();
                        break;
                    }
                    case 'ArrowRight': {
                        if (e.ctrlKey) {
                            aud_elem.currentTime += 300;
                        } else if (e.shiftKey) {
                            aud_elem.currentTime += 60;
                        } else {
                            aud_elem.currentTime += 5;
                        }
                        e.preventDefault();
                        break;
                    }
                }
            }
        }
    } else if (/https:\/\/courses.iris.nitk.ac.in\/mod\/bigbluebuttonbn\/.*$/.test(window.location.href)) {
        // moodle course listings
        let rec_list_table = document.getElementsByClassName('generaltable')[0];

        function get_cell_in_row(row, n) {
            let filtered_rows = row.getElementsByClassName(`c${n}`);
            if (filtered_rows) return filtered_rows[0];
        }

        function append_cell_in_row(row) {
            let row_html_collection = row.children;
            let new_cell = row_html_collection[row_html_collection.length - 1].cloneNode(true);
            new_cell.innerHTML = '';
            row_html_collection[row_html_collection.length - 1].parentNode.appendChild(new_cell);
        }

        function update_last_cell_in_row(row, cell_content) {
            let row_html_collection = row.children;
            let last_cell = row_html_collection[row_html_collection.length - 1];
            last_cell.innerHTML = cell_content;
        }

        let appended_cells = false;

        function show_seen_data() {
            let head_row = rec_list_table.getElementsByTagName('thead')[0].getElementsByTagName('tr')[0];
            if (!appended_cells){
                append_cell_in_row(head_row);
                update_last_cell_in_row(head_row, 'Seen');
            }

            Array.from(rec_list_table.getElementsByTagName('tbody')[0].children).forEach((row) => {
                let video_id = /^recording-tr-(.*)$/.exec(row.id)[1];
                let seen_duration = parseFloat(GM_getValue(`moodle_last_time_${video_id}`));
                if (seen_duration == 0) {
                    if (!appended_cells) append_cell_in_row(row);
                    update_last_cell_in_row(row, '✓');
                } else if (!seen_duration) {
                    if (!appended_cells) append_cell_in_row(row);
                    update_last_cell_in_row(row, '-');
                } else {
                    let total_duration = parseFloat(row.children[row.childElementCount - (appended_cells?2:1)].innerText) * 60;
                    if (total_duration) {
                        let seen_percent = Math.round(seen_duration*100/total_duration);
                        if (seen_percent >= 98) {
                            if (!appended_cells) append_cell_in_row(row);
                            update_last_cell_in_row(row, '✓');
                        } else {
                            if (!appended_cells) append_cell_in_row(row);
                            update_last_cell_in_row(row, `${seen_percent}%`);
                        }
                    }
                }
            });

            appended_cells = true;
        }

        function fill_notes_in_row(row, note) {
            let notes_div = document.createElement('div');
            notes_div.innerText = note;
            notes_div.setAttribute('style', 'font-size: 10px;');
            notes_div.setAttribute('class', 'user-note');
            get_cell_in_row(row, 2).appendChild(notes_div);
        }

        function notes_user_input(row, video_id) {
            return (e) => {
                let filled_note = get_cell_in_row(row, 2).getElementsByClassName('user-note');
                let note = '';
                if (filled_note.length > 0) {
                    note = window.prompt('', filled_note[0].innerText);
                    if (note === null) return;
                    filled_note[0].innerText = note;
                } else {
                    note = window.prompt();
                    if (note === null) return;
                    fill_notes_in_row(row, note);
                }
                GM_setValue(`moodle_notes_${video_id}`, note);
            };
        }

        function populate_notes() {
            Array.from(rec_list_table.getElementsByTagName('tbody')[0].children).forEach((row) => {
                let video_id = /^recording-tr-(.*)$/.exec(row.id)[1];
                let row_notes = GM_getValue(`moodle_notes_${video_id}`) || '';
                if (row_notes) {
                    fill_notes_in_row(row, row_notes);
                }
                // hook up note edit click listener
                get_cell_in_row(row, 2).addEventListener('click', notes_user_input(row, video_id));
            });
        }

        setInterval(show_seen_data, 10000);
        show_seen_data();
        populate_notes();
    }
})();
