(function (root, factory) {
  // Browser globals.
  root.lazyLoadAdSlot = factory(root.jQuery);
}(this, function ($) {
  'use strict';
  var lazyLoadAdSlot = {

    adSlot: {},
    top: 1,

    setTag: function (tag) {
      this.adSlot = tag;
    },
    getTag: function () {
      return this.adSlot;
    },
    getTop: function (tag) {
      var initialTop = parseInt(tag.top);
      return isNaN(initialTop) ? this.top : initialTop;
    },
    /**
     * We need at least one selector, so check for it.
     * @returns {string}
     */
    checkMethod: function () {
      var selectorQTY = this.adSlot.ad_placement.length;

      if (selectorQTY === 0) {
        throw new Error('You need to provide at least on selector.');
      }

      return selectorQTY > 1 ? 'multiple' : 'single';
    },
    /**
     * Get the method.
     * @returns {string|thrown error}
     */
    getMethod: function () {
      // Validate it first.
      try {
        return this.checkMethod();
      }
      catch (err) {
        console.debug(err);
      }
    },
    // todo: Implement(not tested).
    appendBefore: function (el, html) {
      $(html).insertBefore(el);
    },
    appendAfter: function (el, html) {
      $(html).insertAfter(el);
    },
    detectSlot: function () {
      var $window = $(window);
      var tag = this.getTag(),
        method = this.getMethod();

      for (var i = 0; i < tag.ad_placement.length; i++) {
        // Get the tag one more time
        // as we check if the add was added for specific selector.
        var tag = this.getTag(),
          el = $(tag.ad_placement[i]),
          onScrollEnabled = (tag.onscroll === 1);

        // Check if the element exists.
        if (!el.length) {
          continue;
        }

        // Detect needed variable only when they are needed.
        if (onScrollEnabled) {
          var offset = el.offset(),
            windowTop = $window.scrollTop(),
            elTopOffset = offset.top,
            windowHeight = $window.height(),
          // Used for comparison on initial page load.
            loadHeightInitial = windowTop + elTopOffset + el.height() - this.top,
          // Used for comparison on page scroll.
            loadHeightScroll = elTopOffset + el.height() - this.top;
        }

        if (
          (!onScrollEnabled && !tag.added['selector_' + i]) ||
          (onScrollEnabled && !tag.added['selector_' + i]
            && ((windowHeight > loadHeightInitial) || (windowTop + windowHeight) >= loadHeightScroll)
          )
        ) {
          tag.added['selector_' + i] = true;
          this.setTag(tag);

          // Add the slot.
          if (method === 'single') {
            this.addSlotSingle(tag, i, el);
          }
          else if (method === 'multiple') {
            this.addSlotMultiple(tag, i, el);
          }
          else {
            console.debug('No known implementation method detected.');
          }

        }
      }
    },
    /**
     * Identical as this.addSlotMultiple.
     * Keep it separate for now.
     */
    addSlotSingle: function (tag, delta, el) {
      // Generate new slot definition/display with incremental id as unique.
      var currentIDregex = new RegExp(tag.ad_tag, 'g'),
        newID = tag.ad_tag + '_' + delta,
        adSlotDisplay = tag.renderedDfp.replace(currentIDregex, newID);

      // Generate new slot display with incremental id as unique.
      var adSlotDefinition = tag.slotDefinition.replace(currentIDregex, newID);

      // Append the Slot definition/display.
      this.appendAfter(el, $(adSlotDisplay).prepend('<script>' + adSlotDefinition + '</script>'));

      // Refresh the tag.
      googletag.pubads().refresh([googletag.slots[newID]]);
    },
    /**
     * Identical as this.addSlotSingle.
     * Keep it as it is for now.
     */
    addSlotMultiple: function (tag, delta, el) {
      // Generate new slot definition/display with incremental id as unique.
      var currentIDregex = new RegExp(tag.ad_tag, 'g'),
        newID = tag.ad_tag + '_' + delta,
        adSlotDisplay = tag.renderedDfp.replace(currentIDregex, newID);

      // Generate new slot display with incremental id as unique.
      var adSlotDefinition = tag.slotDefinition.replace(currentIDregex, newID);

      // Append the Slot definition/display.
      this.appendAfter(el, $(adSlotDisplay).prepend('<script>' + adSlotDefinition + '</script>'));

      // Refresh the tag.
      googletag.pubads().refresh([googletag.slots[newID]]);
    },
    // Append the Ad to the page.
    execute: function (tag) {
      // Indicator to load the Ad only once.
      var self = this;

      tag.added = [];
      this.setTag(tag);
      this.top = this.getTop(tag);

      // Trigger needed action by onScroll request.
      switch (tag.onscroll) {
        case 1:
          // Initial detection.
          this.detectSlot();

          // Act on the actual scroll.
          $(window).on('scroll', function () {
            self.detectSlot();
          });

          break;

        default:
          this.detectSlot();
      }
    },
  };

  // Starting point.
  return function (AdSlotTag) {
    return !!(window.googletag && AdSlotTag &&
    $(AdSlotTag.ad_placement).length &&
    lazyLoadAdSlot.execute(AdSlotTag));
  };

}));
