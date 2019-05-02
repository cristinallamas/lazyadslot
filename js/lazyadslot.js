/**
 * @file
 * Add the Ad Slots in a lazy load manner.
 */
var lazyLoadAdSlot = lazyLoadAdSlot || {};

(function ($) {

  'use strict';

  var windowHeight = window.innerHeight;
  var initialized = false;
  var lazyslotready = new Event('lazyadslot:slotready', {bubbles:true});

  /**
   *
   * @param fn
   * @param threshold
   * @param scope
   * @returns {Function}
   * @private
   */
  function _throttle(fn, threshold, scope) {
    threshold || (threshold = 250);
    var last,
      deferTimer;
    return function () {
      var context = scope || this;
      var now = +new Date,
        args = arguments;
      if (last && now < last + threshold) {
        // Hold on to it.
        clearTimeout(deferTimer);
        deferTimer = setTimeout(function () {
          last = now;
          fn.apply(context, args);
        }, threshold);
      }
      else {
        last = now;
        fn.apply(context, args);
      }
    };
  }

  var lazyLoadAd = {

    adSlot: {},
    adSlotCounter: {},
    adSlotsStore: [],
    top: 1,
    slotId: '',
    attr: {},
    /**
     * Get the top value for each lazyadslot (value in context reaction).
     * @param tag
     * @returns {number}
     */
    getTop: function (tag) {
      var initialTop = parseInt(tag.top);
      return isNaN(initialTop) ? this.top : initialTop;
    },
    /**
     * Push add to the page in the way specified in the context reaction.
     *
     * @param $el
     * @param html
     * @param adSlot
     */
    pushAd: function ($el, html, adSlot) {

      switch (adSlot.attach_how) {
        case 'before':
          $(html).insertBefore($el);
          break;
        case 'after':
          $(html).insertAfter($el);
          break;
         case 'replace':
           $($el).replaceWith(html);
           break;
        case 'inside':
          $(html).appendTo($el);
          break;
      }
    },
    /**
     * Increase the counter per specified slot name.
     *
     * @param slotName
     * @returns {*}
     */
    increaseSlotCounter: function (slotName) {

      var adPlacement = this.adSlot["0"].ad_placement;
      var placementTimes = $(adPlacement).length;

      if (isNaN(this.adSlotCounter[slotName])) {
        this.adSlotCounter[slotName] = 0;
      }
      else {
        this.adSlotCounter[slotName]++;
      }

      return this.adSlotCounter[slotName];
    },
    /**
     * Add default attributes and merge with passed ones.
     *
     * @param newId
     * @returns {*}
     */
    getAttr: function (newId) {
      var defaultClasses = 'lazyadslot lazyadslot-' + newId;
      // Add default classes.
      if (this.attr.class) {
        this.attr.class = this.attr.class + ' ' + defaultClasses;
      }
      else {
        this.attr.class = defaultClasses;
      }
      return this.attr;
    },
    /**
     *
     * @param force
     */
    detectSlot: function (force, ad_tag) {
      var uniqueKey, offset, slotElement;
      var windowTop = document.body.scrollTop || document.documentElement.scrollTop;
      // For each of the tags that are set as lazyloading.
      for (var i = 0; i < this.adSlotsStore.length; i++) {
        // Add to ad to the page.
        var ad = this.adSlotsStore[i].tag;
        var ad_slot_name = ad.ad_tag;
        var adPlacement = this.adSlotsStore[i].$el.eq(0).selector;
        // times that an ad has placeholders.
        var placeholderTimes = this.adSlotsStore[i].$el.length;
        // For each of the times that a placeholder of a lazy ad appears on the page.
        for (var j = 0; j < placeholderTimes; j++) {
          if (ad.lazload_limit !== 'undefined' && j >= ad.lazload_limit) {
            break;
          }
          uniqueKey = ad.ad_tag + '_' + j;
          slotElement = this.adSlotsStore[i];
          // Invidivual offset per slot, even if slot repeated.
          //offset formula: parseInt($el.offset().top, 10) + $el.height() - this.top,
          var individualOffset = parseInt(this.adSlotsStore[i].$el.eq(j).offset().top, 10)
            + this.adSlotsStore[i].$el.eq(j).height() - this.top;
          // slotElement[$ej,tag];
          if (!this.added[uniqueKey] && slotElement && slotElement.$el) {
            if (force === true || ad.onscroll === 1) {
              offset = (windowTop + windowHeight);
              if ((force === true &&  ad_tag === ad.ad_tag) || offset > individualOffset) {
                this.added[uniqueKey] = true;
                this.addSlot(ad, slotElement.$el[j]);
              }
            }
          }

        } // end for j
      } // end for i
    },
    /**
     * Increases the key/value pair for position dinamically for multiple body ads.
     *
     * @param newAttr
     * @param adSlotRendered
     * @returns {adSlotRendered}
     */
    replaceDFPInfo: function(newAttr,adSlotRendered) {
      // Grab lazyadslot adslot name and slotnumber
      var matchAd =  newAttr.class.match(/(lazyadslot lazyadslot-)(\w*)(_)([0-9]+)/m);
      // Grab slot number (when multiple ads it adds _0,_1,_2 at the end of an ad class).
      var adSlotNumber = matchAd[4];
      // Grab targeting from the rendered adslot.
      var renderedDfp = adSlotRendered.match(/(\.setTargeting\(\"position\"\, \")([0-9]*)/);
      // Grab position key/value pair from the rendered adslot.
      var positionString = renderedDfp[1];
      // We grab the position defined as a start point for the incrementing.
      var firstPos = renderedDfp[2];
      // Adslot number added to position to increment it.
      var finalPos = parseInt(adSlotNumber)+parseInt(firstPos);
      // we replace with the new position values.
      var adSlotRendered = adSlotRendered.replace(positionString+firstPos,positionString+finalPos);
      // we return the updated/incremented rendered adslot.
      return adSlotRendered;
    },
    /**
     *
     * @param selector
     * @returns {boolean}
     */
    isSlotStored: function (selector) {
      var added = false;
      if (this.adSlotsStore.length > 0) {
        $.each(this.adSlotsStore, function (index, value) {
          if (value.$el.selector === selector) {
            added = true;
          }
        });
      }
      return added;
    },
    /**
     * Add elements to the store array.
     */
    addSlotToStore: function () {

      for (var slotKey = 0; slotKey < this.adSlot.length; slotKey++) {
        var ad = this.adSlot[slotKey];
        for (var i = 0; i < ad.ad_placement.length; i++) {
          var selector = ad.ad_placement[i];
          // If selector not empty.
          if (selector && selector.length > 0) {
            var $el = $(selector);
            if (!this.isSlotStored($el.selector)) {
              // Push elements to the store array.
              this.adSlotsStore.push({
                $el: $el,
                tag: ad,
              });
            }
          }
        }
      }
    },
    /**
     * Generate new slot ID, and push the Ad into the page.
     */
    addSlot: function (adSlot, $el) {

      // Generate new slot definition/display with incremental id as unique.
      var currentIDregex = new RegExp(adSlot.ad_tag, 'g');
      //  var  adSlot.ad_tag

      // modify positioins
      var newID = adSlot.ad_tag + '_' + this.increaseSlotCounter(adSlot.ad_tag);

      var adSlotRendered = adSlot.renderedDfp.replace(currentIDregex, newID);
      // Wrap the rendered slot.
      var newAttr = this.getAttr(newID);
      // Replace (increase) ad position information dinamically.
      var updatedSlot = this.replaceDFPInfo(newAttr,adSlotRendered);

      adSlotRendered = $('<div/>', newAttr).append(updatedSlot);

      // Append the Slot declaration/display.
      this.pushAd($el, adSlotRendered, adSlot);

      // Trigger an event to say the slot is added to the page
      adSlotRendered[0].dispatchEvent(lazyslotready);

      // Refresh the tag.
      if (googletag.pubads().isInitialLoadDisabled()) {
        googletag.pubads().refresh([googletag.slots[newID]]);
      }
      this.slotId = newID;
      // Always destroy generated attributes.
      this.attr = {};
    },
    /**
     * Create tag.
     * @param tag
     * @param attr
     * @returns {*}
     */
    createTag: function (tag, attr) {
      this.top = this.getTop(tag);
      this.adSlot.push(tag);
      if (!$.isEmptyObject(attr)) {
        this.attr = attr;
      }
      // Instantly Ad load.
      this.addSlotToStore();
      // If it's not setup to load on scroll,
      // force it though conditions in order to be added instantly.
      this.detectSlot(!tag.onscroll, tag.ad_tag);
      return this;
    },
    /**
     * Append the Ad to the page.
     */
    execute: function () {
      var self = this;
      this.added = {};
      this.adSlot = [];

      window.addEventListener('scroll', _throttle(function () {
        self.detectSlot();
      }, 100));

      window.onresize = _throttle(function (event) {
        windowHeight = window.innerHeight;
        // Reset adSlotsStore as not to keep adding the same slots.
        self.addSlotToStore();
      }, 100);
    },
  };

  /**
   * Initialization function.
   *
   * @returns {{adSlot: {}, adSlotCounter: {}, adSlotsStore: Array, top: number, slotId: string, attr: {}, getTop: Function, pushAd: Function, increaseSlotCounter: Function, getAttr: Function, detectSlot: Function, isSlotStored: Function, addSlotToStore: Function, addSlot: Function, createTag: Function, execute: Function}}
   */
  lazyLoadAdSlot.init = function () {
    if (initialized === false) {
      lazyLoadAd.execute();
      initialized = true;
    }
    return lazyLoadAd;
  };

})(jQuery);
