// Copyright 2017 Quip
// @flow

// TODO(elsigh): import here breaks util.test.js - jest complains about module
// $FlowIssueQuipModule
// import quip from "quip";

import addDays from "date-fns/add_days";
import differenceInDays from "date-fns/difference_in_days";
import getDay from "date-fns/get_day";
import getDaysInMonth from "date-fns/get_days_in_month";
import isAfter from "date-fns/is_after";
import isEqual from "date-fns/is_equal";
import isWithinRange from "date-fns/is_within_range";
import lastDayOfMonth from "date-fns/last_day_of_month";
import startOfMonth from "date-fns/start_of_month";
import subDays from "date-fns/sub_days";
import subMonths from "date-fns/sub_months";

import range from "lodash.range";

import polyfills from "./polyfills";
import type { EventRecord } from "./model";

import type {
    DateRange,
    MouseCoordinates,
    MouseStartCoordinates,
    MovingEventRect,
    MovingEventRectMap,
} from "./types";

const makeDateRange = (startDate: Date, numberOfDays: number) =>
    range(0, numberOfDays).map(index => addDays(startDate, index));

export const getCalendarMonth = (monthDate: Date): Array<Date> => {
    const daysInMonth = getDaysInMonth(monthDate);
    const firstDayOfWeek = getDay(startOfMonth(monthDate));

    const prevMonthDate = subMonths(monthDate, 1);
    const previousMonthDays = makeDateRange(
        subDays(lastDayOfMonth(prevMonthDate), firstDayOfWeek - 1),
        firstDayOfWeek,
    );

    const lastDayOfMonthInWeek = getDay(lastDayOfMonth(monthDate));
    const nextMonthDays = makeDateRange(
        addDays(lastDayOfMonth(monthDate), 1),
        6 - lastDayOfMonthInWeek,
    );

    return [
        ...previousMonthDays,
        ...makeDateRange(startOfMonth(monthDate), daysInMonth),
        ...nextMonthDays,
    ];
};

export const dayInMonth = (date: Date, month: Date) =>
    isWithinRange(date, startOfMonth(month), lastDayOfMonth(month));

export const getIsSmallScreen = (): boolean =>
    // $FlowIssueQuipModule
    quip.apps.getContainerWidth() <= 600;

export const isElAtPoint = (
    xy: MouseCoordinates,
    className: string,
): boolean => {
    const { x, y } = xy;
    return !!polyfills
        .elementsFromPoint(x, y)
        .find(el => el.classList.contains(className));
};

export const elAtPoint = (
    xy: MouseCoordinates,
    className: string,
): ?HTMLElement => {
    const { x, y } = xy;
    return polyfills
        .elementsFromPoint(x, y)
        .find(el => el.classList.contains(className));
};

export const dayElAtPoint = (xy: MouseCoordinates) =>
    elAtPoint(xy, "Calendar__day");

export const dateAtPoint = (xy: MouseCoordinates) => {
    const dayEl = dayElAtPoint(xy);
    if (!dayEl) {
        return;
    }
    const dateString = Number(dayEl.getAttribute("data-date-time"));
    if (!dateString) {
        return;
    }
    let d = new Date();
    d.setTime(dateString);
    return d;
};

export const getMovingEventDateRange = (
    movingEvent: EventRecord,
    mouseCoordinates: MouseCoordinates,
    mouseStartCoordinates: MouseStartCoordinates,
) => {
    const { start, end } = movingEvent.getDateRange();
    const endDragDate = dateAtPoint(mouseCoordinates);
    if (endDragDate) {
        const diffInDays = differenceInDays(
            mouseStartCoordinates.date,
            endDragDate,
        );
        if (Math.abs(diffInDays) !== 0) {
            const newStartDate = subDays(start, diffInDays);
            const newEndDate = subDays(end, diffInDays);
            return { start: newStartDate, end: newEndDate };
        }
    }
    return { start, end };
};

export const getResizingEventDateRange = (
    resizingEvent: EventRecord,
    mouseCoordinates: MouseCoordinates,
) => {
    const { start, end } = resizingEvent.getDateRange();
    const newEndDate = dateAtPoint(mouseCoordinates);
    if (
        newEndDate &&
        (isAfter(newEndDate, start) || isEqual(newEndDate, start))
    ) {
        const diffInDays = differenceInDays(end, newEndDate);
        if (Math.abs(diffInDays) !== 0) {
            return { start, end: newEndDate };
        }
    }
    return { start, end };
};

export const areDateRangesEqual = function(
    a: DateRange,
    b: DateRange,
): boolean {
    if (a.start.getTime() !== b.start.getTime()) {
        return false;
    }
    if (a.end.getTime() !== b.end.getTime()) {
        return false;
    }
    return true;
};

export function getMovingEventRectMap(
    movingEvent: EventRecord,
    mouseStartCoordinates: MouseStartCoordinates,
    mouseCoordinates?: MouseCoordinates,
): MovingEventRectMap {
    const movingEventElMap = movingEvent.getDomNodesForEvent();
    //console.log("getMovingEventRectMap movingEventElMap", movingEventElMap);
    let rectMap = {};
    Object.keys(movingEventElMap).forEach((weekStartTime, i) => {
        const el = movingEventElMap[weekStartTime];
        rectMap[weekStartTime] = getMovingEventRect(
            el,
            mouseStartCoordinates,
            mouseCoordinates,
        );
        //console.log("weekStartTime", weekStartTime, el, rectMap[weekStartTime]);
    });
    return rectMap;
}

function getMovingEventRect(
    el: HTMLDivElement,
    mouseStartCoordinates: MouseStartCoordinates,
    mouseCoordinates: ?MouseCoordinates,
): MovingEventRect {
    /*
    console.log(
        "getMovingEventRect: ",
        el,
        mouseStartCoordinates,
        mouseCoordinates,
    );
    */
    mouseCoordinates = mouseCoordinates || mouseStartCoordinates;
    const rect = el.getBoundingClientRect();
    const offsetX = mouseStartCoordinates.x - rect.left;
    const offsetY = mouseStartCoordinates.y - rect.top;
    const top = mouseCoordinates.y - offsetY;
    const left = mouseCoordinates.x - offsetX;
    const wrapperEl = el.parentElement;
    // $FlowFixMe
    const width = wrapperEl.offsetWidth;
    const height = rect.height;
    return {
        height,
        left,
        top,
        width,
    };
}
