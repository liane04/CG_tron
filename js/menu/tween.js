// Minimal tween utility — avoids extra dependency.
// API: tween(obj, props, { duration, easing, onUpdate, onComplete }) → handle.
// Each tween writes to obj.<prop> on every frame (ticked from updateTweens()).

var tweens = [];
var clock = (typeof performance !== 'undefined' && performance.now)
    ? performance.now.bind(performance)
    : Date.now.bind(Date);

export var Easing = {
    linear:    function (t) { return t; },
    easeInOut: function (t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; },
    easeOut:   function (t) { return 1 - (1 - t) * (1 - t); },
    easeIn:    function (t) { return t * t; },
    easeOutBack: function (t) {
        var c1 = 1.70158, c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    easeOutElastic: function (t) {
        var c4 = (2 * Math.PI) / 3;
        if (t === 0) return 0;
        if (t === 1) return 1;
        return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }
};

export function tween(target, toProps, opts) {
    opts = opts || {};
    var duration = opts.duration != null ? opts.duration : 0.6;
    var easing = opts.easing || Easing.easeInOut;
    var fromProps = {};
    Object.keys(toProps).forEach(function (k) { fromProps[k] = target[k]; });

    var handle = {
        target: target,
        from: fromProps,
        to: toProps,
        duration: duration,
        easing: easing,
        onUpdate: opts.onUpdate || null,
        onComplete: opts.onComplete || null,
        startTime: clock() / 1000 + (opts.delay || 0),
        cancelled: false
    };
    tweens.push(handle);
    return handle;
}

export function cancelTween(handle) {
    if (handle) handle.cancelled = true;
}

export function updateTweens() {
    var now = clock() / 1000;
    for (var i = tweens.length - 1; i >= 0; i--) {
        var t = tweens[i];
        if (t.cancelled) { tweens.splice(i, 1); continue; }
        if (now < t.startTime) continue;
        var progress = t.duration > 0 ? Math.min(1, (now - t.startTime) / t.duration) : 1;
        var k = t.easing(progress);
        Object.keys(t.to).forEach(function (key) {
            t.target[key] = t.from[key] + (t.to[key] - t.from[key]) * k;
        });
        if (t.onUpdate) t.onUpdate(t.target);
        if (progress >= 1) {
            tweens.splice(i, 1);
            if (t.onComplete) t.onComplete(t.target);
        }
    }
}
