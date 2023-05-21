import { ChevronLeftIcon, ChevronRightIcon } from './icons'
import './Pagination.css'

interface PaginationProps {
    prevCursor: string | undefined
    nextCursor: string
    onPrev: (cursor: string | undefined) => void
    onNext: (cursor: string | undefined) => void
}

export default function CursorPagination({
    prevCursor,
    nextCursor,
    onPrev,
    onNext,
}: PaginationProps) {
    return (
        <div className="ui-pagination">
            <button className="pagination-button prev"
                disabled={prevCursor === undefined}
                onClick={() => onPrev(prevCursor)}>
                <ChevronLeftIcon />
                Previous
            </button>
            <button className="pagination-button next"
                // disabled={nextCursor}
                onClick={() => onNext(nextCursor)}>
                Next
                <ChevronRightIcon />
            </button>
        </div>
    )
}
