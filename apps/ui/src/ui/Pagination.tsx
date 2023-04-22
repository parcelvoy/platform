import { ChevronLeftIcon, ChevronRightIcon } from './icons'
import './Pagination.css'

interface PaginationProps {
    itemsPerPage: number
    onChangePage: (page: number) => void
    page: number
    total: number
}

type Page = number | '...'

export default function Pagination({
    onChangePage,
    page = 0,
    total = 0,
}: PaginationProps) {

    if (total == null) return null

    const pageCount = Math.max(0, total)

    if (pageCount <= 1) return null

    const getRange = (start: number, end: number) => {
        return Array(end - start + 1)
            .fill(0)
            .map((_, i) => i + start)
    }

    const pagination = (currentPage: number, pageCount: number): Page[] => {
        let delta: number
        if (pageCount <= 7) {
            // delta === 7: [1 2 3 4 5 6 7]
            delta = 7
        } else {
            // delta === 2: [1 ... 4 5 6 ... 10]
            // delta === 4: [1 2 3 4 5 ... 10]
            delta = currentPage > 4 && currentPage < pageCount - 3 ? 2 : 4
        }

        const range = {
            start: Math.round(currentPage - delta / 2),
            end: Math.round(currentPage + delta / 2),
        }

        if (range.start - 1 === 1 || range.end + 1 === pageCount) {
            range.start += 1
            range.end += 1
        }

        let pages: Page[] = currentPage > delta
            ? getRange(Math.min(range.start, pageCount - delta), Math.min(range.end, pageCount))
            : getRange(1, Math.min(pageCount, delta + 1))

        const withDots = (value: number, pair: Page[]) => (pages.length + 1 !== pageCount ? pair : [value])

        if (pages[0] !== 1) {
            pages = withDots(1, [1, '...']).concat(pages)
        }

        if (pages[pages.length - 1] < pageCount) {
            pages = pages.concat(withDots(pageCount, ['...', pageCount]))
        }

        return pages
    }

    const pages = pagination(page, pageCount)

    const Page = ({ index }: { index: number }) => {
        const currPage = index - 1
        return <button
            onClick={() => onChangePage(currPage)}
            className={`pagination-button ${currPage === page ? 'selected' : ''}`} key={index}>
            {index.toLocaleString()}
        </button>
    }

    return (
        <div className="ui-pagination">
            <button className="pagination-button prev"
                disabled={page <= 0}
                onClick={() => onChangePage(page - 1)}>
                <ChevronLeftIcon />
                Previous
            </button>
            {
                pages.map((curr, index) => (
                    curr === '...'
                        ? <div className="spacer" key={index}>{curr}</div>
                        : <Page index={curr} key={index} />
                ))
            }
            <button className="pagination-button next"
                disabled={(page + 1) >= total}
                onClick={() => onChangePage(page + 1)}>
                Next
                <ChevronRightIcon />
            </button>
        </div>
    )
}
