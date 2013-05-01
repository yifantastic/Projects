SpiralTree.prototype.spiralPath = function (point, tValue, sign) {
    var spiralLine = d3.svg.line()
    .x(function (d) { return x(d.x) })
    .y(function (d) { return y(d.y) });
    var adjustAlpha;
    if (sign == "-") adjustAlpha = -this.alpha;
    else adjustAlpha = this.alpha;
    var r = Math.sqrt((point.x - this.center.x) * (point.x - this.center.x) + (point.y - this.center.y) * (point.y - this.center.y));
    var initialTheta = Math.acos((point.x - this.center.x) / r);
    var theta = (point.y - this.center.y) < 0 ? 2 * Math.PI - initialTheta : initialTheta;
    var step;
    var ncount = 60;
    if (tValue == undefined)
        step = (Math.PI / Math.tan(this.alpha)) / ncount; //0.05;
    else step = tValue / ncount;
    var spiral = [];
    for (var i = 0; i < ncount; i++) {
        var currentTheta = theta + Math.tan(adjustAlpha) * i * step;
        //Below is using of the equation wrote in the paper
        spiral.push({ x: r * Math.exp(-i * step) * Math.cos(currentTheta) + this.center.x, y: r * Math.exp(-i * step) * Math.sin(currentTheta) + this.center.y });
    }
    currentTheta = theta + Math.tan(adjustAlpha) * tValue;
    spiral.push({ x: r * Math.exp(-tValue) * Math.cos(currentTheta) + this.center.x, y: r * Math.exp(-tValue) * Math.sin(currentTheta) + this.center.y });
    return spiralLine(spiral);
}

SpiralTree.prototype.drawSpiralSegment = function (point, tValue, sign, opacity) {
    if (point.r == 0) return;
    if (this.spiralColor == undefined)
        this.spiralColor = 'black';
    this.spiralTreeLayer.append("svg:path")
        .attr("d", this.spiralPath(point, tValue, sign))
        .attr("class", "spiral")
        .attr('stroke', this.spiralColor)
        .attr('fill', 'none')
        .attr('stroke-width', this.strokeWidth)
        .attr('opacity', opacity);
}

SpiralTree.prototype.drawTree = function () {
    var loopi = 0;
    var joinPoint = null;
    var waveFront = new BinarySearchArray();

    while (loopi < this.terminals.length || joinPoint != null || waveFront.arrayData.length != 0) {
        var currentEvent;
        if (loopi >= this.terminals.length && joinPoint == null) {
            this.drawSpiralSegment(waveFront.arrayData[waveFront.arrayData.length - 1]);
            waveFront.remove(waveFront.arrayData[waveFront.arrayData.length - 1], waveFront.arrayData.length - 1);
            break;
        }

        if (joinPoint == null) {
            currentEvent = this.terminals[loopi];
            loopi++;
            var position = waveFront.add(currentEvent);
            var neighborRight = (position + 1) > (waveFront.arrayData.length - 1) ? (position + 1 - waveFront.arrayData.length) : (position + 1);
            var neighborLeft = (position - 1) < 0 ? (position - 1 + waveFront.arrayData.length) : (position - 1);
            if (neighborRight == position && neighborLeft == position) continue;
            if (this.spiralJoinPoint(waveFront.arrayData[position], waveFront.arrayData[neighborRight]) == null) {
                joinPoint = this.auxCircleJoinPoint(waveFront.arrayData[neighborRight], waveFront.arrayData[position].r, "+");
                this.drawSpiralSegment(waveFront.arrayData[neighborRight], joinPoint.ti, "+");
                waveFront.remove(waveFront.arrayData[neighborRight], neighborRight);
                position = waveFront.add(joinPoint);
            }
            else if (this.spiralJoinPoint(waveFront.arrayData[neighborLeft], waveFront.arrayData[position]) == null) {
                joinPoint = this.auxCircleJoinPoint(waveFront.arrayData[neighborLeft], waveFront.arrayData[position].r, "-");
                this.drawSpiralSegment(waveFront.arrayData[neighborLeft], joinPoint.ti, "-");
                waveFront.remove(waveFront.arrayData[neighborLeft], neighborLeft);
                position = waveFront.add(joinPoint);
            }
            joinPoint = this.calculateJP(waveFront);
            if (joinPoint != null && loopi < this.terminals.length && joinPoint.r < this.terminals[loopi].r)
                joinPoint = null;
        }
        else {
            if (this.overlapArea(waveFront.arrayData[joinPoint.parentMinus], waveFront.arrayData[joinPoint.parentPlus], this.threshold * 3)) {
                this.drawSpiralSegment(waveFront.arrayData[joinPoint.parentPlus], joinPoint.tPlus, "+");
                this.drawSpiralSegment(waveFront.arrayData[joinPoint.parentMinus], joinPoint.tMinus, "-");
                waveFront.remove(waveFront.arrayData[joinPoint.parentPlus], joinPoint.parentPlus, joinPoint.parentMinus);
                position = waveFront.add(joinPoint);
            }
            else if (this.overlapArea(joinPoint, waveFront.arrayData[joinPoint.parentPlus])) {
                var newJoinPoint = this.auxCircleJoinPoint(waveFront.arrayData[joinPoint.parentMinus], waveFront.arrayData[joinPoint.parentPlus].r, "+");
                this.drawSpiralSegment(waveFront.arrayData[joinPoint.parentMinus], newJoinPoint.ti, "+");
                waveFront.remove(waveFront.arrayData[joinPoint.parentMinus], joinPoint.parentMinus);
                position = waveFront.add(newJoinPoint);
            }
            else if (this.overlapArea(joinPoint, waveFront.arrayData[joinPoint.parentMinus])) {
                var newJoinPoint = this.auxCircleJoinPoint(waveFront.arrayData[joinPoint.parentPlus], waveFront.arrayData[joinPoint.parentMinus].r, "-");
                this.drawSpiralSegment(waveFront.arrayData[joinPoint.parentPlus], newJoinPoint.ti, "-");
                waveFront.remove(waveFront.arrayData[joinPoint.parentPlus], joinPoint.parentPlus);
                position = waveFront.add(newJoinPoint);
            }
            else {
                this.drawSpiralSegment(waveFront.arrayData[joinPoint.parentPlus], joinPoint.tPlus, "+");
                this.drawSpiralSegment(waveFront.arrayData[joinPoint.parentMinus], joinPoint.tMinus, "-");
                waveFront.remove(waveFront.arrayData[joinPoint.parentPlus], joinPoint.parentPlus, joinPoint.parentMinus);
                position = waveFront.add(joinPoint);
            }
            joinPoint = this.calculateJP(waveFront);
            if (joinPoint != null && loopi < this.terminals.length && joinPoint.r < this.terminals[loopi].r)
                joinPoint = null;
        }
    }
    Array.prototype.unshift.call(this.terminals, this.center);
    var tempCenterColor = this.centerColor;
    var tempTerminalColor = this.terminalColor;
    for (tI in this.terminals) {
        if (tI == 0) this.drawNode(this.terminals[tI], tempCenterColor);
        else this.drawNode(this.terminals[tI], tempTerminalColor);
    }
    Array.prototype.shift.call(this.terminals, this.center);
}