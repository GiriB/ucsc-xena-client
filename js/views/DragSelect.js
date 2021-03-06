'use strict';

var React = require('react');
//var ReactDOM = require('react-dom');
var Rx = require('rx');
var _ = require('../underscore_ext');

var styles = {
	wrapper: {
		position: 'relative',
	},
	overlay: {
		backgroundColor: 'rgba(128, 128, 128, 0.3)',
		position: 'absolute',
		pointerEvents: 'none'
	}
};

var min = (x, y) => x < y ? x : y;
var flop = (x, y) => x < y ? {start: x, end: y} : {start: y, end: x};

var clip = (min, max, x) => x < min ? min : (x > max ? max : x);

function targetXPos(target, ev, width) {
	var bb = target.getBoundingClientRect();
	return clip(0, width - 1, ev.clientX - bb.left);
}

// Browsers give us coordinates that aren't always within the element. We
// would expect coords [0, width - 1] to indicate which pixel the mouse is over,
// but sometimes get coords outside that range.
//
// We clip start and end to [0, width - 1].
var DragSelect = React.createClass({
	getDefaultProps() {
		return {enabled: true};
	},
	componentWillMount() {
		var mousedown = new Rx.Subject();
		var mousedrag = mousedown.selectMany((down) => {
			var target = down.currentTarget,
				bb = target.getBoundingClientRect(),
				start = targetXPos(target, down, bb.width),
				selection;

			return Rx.DOM.fromEvent(window, 'mousemove').map(function (mm) {
				var end = targetXPos(target, mm, bb.width);

				selection = flop(start, end);
				return {dragging: true, ...selection};
			}).takeUntil(Rx.DOM.fromEvent(window, 'mouseup'))
			.concat(Rx.Observable.defer(() => Rx.Observable.return({selection})));
		});
		this.subscription = mousedrag.subscribe(ev => {
			if (ev.selection) {
				this.props.onSelect && this.props.onSelect(ev.selection);
				this.setState({dragging: false});
			} else {
				this.setState(ev);
			}
		});
		this.dragStart = ev => this.props.enabled && mousedown.onNext(ev);
	},
	componentWillUnmount () {
		this.subscription.dispose();
	},
	getInitialState () {
		return {dragging: false};
	},
	render() {
		var {dragging} = this.state,
			containerProps = _.omit(this.props, 'onSelect', 'enabled'),
			ostyle = dragging ? {
				display: 'block',
				top: 0,
				left: min(this.state.start, this.state.end),
				width: Math.abs(this.state.end - this.state.start),
				height: '100%'
			} : {display: 'none'};
		return (
			<div {...containerProps} style={styles.wrapper} onMouseDown={this.dragStart}>
				<div style={_.merge(styles.overlay, ostyle)}/>
				{this.props.children}
			</div>);
	}
});

module.exports = DragSelect;
