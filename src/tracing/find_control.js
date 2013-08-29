// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

/**
 * @fileoverview FindControl and FindController.
 */
base.requireTemplate('tracing.find_control');

base.require('tracing.timeline_track_view');
base.require('tracing.filter');
base.exportTo('tracing', function() {

  /**
   * FindControl
   * @constructor
   */
  var FindControl = ui.define('find-control');

  FindControl.prototype = {
    __proto__: HTMLUnknownElement.prototype,

    decorate: function() {
      var shadow = this.webkitCreateShadowRoot();
      shadow.applyAuthorStyles = true;
      shadow.resetStyleInheritance = true;

      shadow.appendChild(base.instantiateTemplate('#find-control-template'));

      this.hitCountEl_ = shadow.querySelector('.hit-count-label');

      shadow.querySelector('.find-previous')
          .addEventListener('click', this.findPrevious_.bind(this));

      shadow.querySelector('.find-next')
          .addEventListener('click', this.findNext_.bind(this));

      this.filterEl_ = shadow.querySelector('#find-control-filter');
      this.filterEl_.addEventListener('input',
          this.filterTextChanged_.bind(this));

      this.filterEl_.addEventListener('keydown', function(e) {
        e.stopPropagation();
        if (e.keyCode == 13) {
          if (e.shiftKey)
            this.findPrevious_();
          else
            this.findNext_();
        }
      }.bind(this));

      this.filterEl_.addEventListener('blur', function(e) {
        this.updateHitCountEl_();
      }.bind(this));

      this.filterEl_.addEventListener('focus', function(e) {
        this.controller.reset();
        this.filterTextChanged_();
        this.filterEl_.select();
      }.bind(this));

      // Prevent that the input text is deselected after focusing the find
      // control with the mouse.
      this.filterEl_.addEventListener('mouseup', function(e) {
        e.preventDefault();
      });

      this.updateHitCountEl_();
    },

    get controller() {
      return this.controller_;
    },

    set controller(c) {
      this.controller_ = c;
      this.updateHitCountEl_();
    },

    focus: function() {
      this.filterEl_.focus();
    },

    hasFocus: function() {
      return this.filterEl_ === document.activeElement;
    },

    filterTextChanged_: function() {
      this.controller.filterText = this.filterEl_.value;
      this.updateHitCountEl_();
    },

    findNext_: function() {
      if (this.controller)
        this.controller.findNext();
      this.updateHitCountEl_();
    },

    findPrevious_: function() {
      if (this.controller)
        this.controller.findPrevious();
      this.updateHitCountEl_();
    },

    updateHitCountEl_: function() {
      if (!this.controller || document.activeElement !== this) {
        this.hitCountEl_.textContent = '';
        return;
      }
      var i = this.controller.currentHitIndex;
      var n = this.controller.filterHits.length;
      if (n == 0)
        this.hitCountEl_.textContent = '0 of 0';
      else
        this.hitCountEl_.textContent = (i + 1) + ' of ' + n;
    }
  };

  function FindController() {
    this.timeline_ = undefined;
    this.model_ = undefined;
    this.filterText_ = '';
    this.filterHits_ = new tracing.Selection();
    this.filterHitsDirty_ = true;
    this.currentHitIndex_ = -1;
  };

  FindController.prototype = {
    __proto__: Object.prototype,

    get timeline() {
      return this.timeline_;
    },

    set timeline(t) {
      this.timeline_ = t;
      this.filterHitsDirty_ = true;
    },

    get filterText() {
      return this.filterText_;
    },

    set filterText(f) {
      if (f == this.filterText_)
        return;
      this.filterText_ = f;
      this.filterHitsDirty_ = true;
      this.showHits_(this.filterHits);
    },

    get filterHits() {
      if (this.filterHitsDirty_) {
        this.filterHitsDirty_ = false;
        this.filterHits_.clear();
        this.currentHitIndex_ = -1;

        if (this.timeline_ && this.filterText.length) {
          var filter = new tracing.TitleFilter(this.filterText);
          this.timeline.addAllObjectsMatchingFilterToSelection(
              filter, this.filterHits_);
        }
      }
      return this.filterHits_;
    },

    get currentHitIndex() {
      return this.currentHitIndex_;
    },

    showHits_: function(selection, zoom, pan) {
      if (!this.timeline)
        return;

      this.timeline.selection = selection;

      if (zoom)
        this.timeline.zoomToSelection();
      else if (pan)
        this.timeline.panToSelection();
    },

    find_: function(dir) {
      var firstHit = this.currentHitIndex_ === -1;
      if (firstHit && dir < 0)
        this.currentHitIndex_ = 0;

      var N = this.filterHits.length;
      this.currentHitIndex_ = (this.currentHitIndex_ + dir + N) % N;

      // We allow the zoom level to change only on the first hit. But, when
      // then cycling through subsequent changes, restrict it to panning.
      var zoom = firstHit;
      var pan = true;
      var subSelection = this.filterHits.subSelection(this.currentHitIndex_);
      this.showHits_(subSelection, zoom, pan);
    },

    findNext: function() {
      this.find_(1);
    },

    findPrevious: function() {
      this.find_(-1);
    },

    reset: function() {
      this.filterText_ = '';
      this.filterHitsDirty_ = true;
    }
  };

  return {
    FindControl: FindControl,
    FindController: FindController
  };
});
