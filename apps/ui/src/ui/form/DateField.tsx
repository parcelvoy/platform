import React, { useState } from 'react'
import { useDatePicker } from '@rehookify/datepicker'
import { FieldPath, FieldValues } from 'react-hook-form'
import './DateField.css'
import clsx from 'clsx'
import TextField, { TextFieldProps } from './TextField'
import { usePopper } from 'react-popper'
import { formatISO } from 'date-fns'

interface DateFieldProps<X extends FieldValues, P extends FieldPath<X>> extends TextFieldProps<X, P> { }

export default function DateField<X extends FieldValues, P extends FieldPath<X>>({ form, ...params }: DateFieldProps<X, P>) {

    const [showCalendar, setShowCalendar] = useState(false)
    const [referenceElement, setReferenceElement] = useState<Element | null | undefined>()
    const [popperElement, setPopperElement] = useState<HTMLElement | null | undefined>()
    const { styles, attributes } = usePopper(referenceElement, popperElement, {
        placement: 'bottom-start',
    })
    const [selectedDates, onDatesChange] = useState<Date[]>([])

    const {
        data: { weekDays, calendars },
        propGetters: {
            dayButton,
            previousMonthButton,
            nextMonthButton,
        },
    } = useDatePicker({
        selectedDates,
        onDatesChange: (dates: Date[]) => {
            form?.setValue(params.name, formatISO(dates[0]) as any)
            onDatesChange(dates)
        },
    })

    const { year, month, days } = calendars[0]

    return (
        <div className="ui-date-field">
            <TextField
                form={form} {...params}
                inputRef={setReferenceElement}
                onFocus={() => setShowCalendar(true)} />
            {showCalendar && <section
                className="ui-date-picker"
                ref={setPopperElement}
                style={styles.popper}
                {...attributes.popper}>
                <header>
                    <div className="calendar-pagination">
                        <button {...previousMonthButton()}>&lt;</button>
                        <p>{month} {year}</p>
                        <button {...nextMonthButton()}>&gt;</button>
                    </div>
                    <ul className="calendar-header calendar-grid">
                        {weekDays.map((day) => (
                            <li key={`${month}-${day}`}>{day}</li>
                        ))}
                    </ul>
                </header>
                <ul className="calendar calendar-grid">
                    {days.map((dpDay) => (
                        <li key={dpDay.date}>
                            <button {...dayButton(dpDay)} className={clsx({ today: dpDay.isToday, selected: dpDay.selected })}>{dpDay.day}</button>
                        </li>
                    ))}
                </ul>
            </section>}
        </div>
    )
}
