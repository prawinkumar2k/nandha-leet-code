import { createContext, useContext, useState, useEffect } from 'react';

const DateContext = createContext(null);

export function DateProvider({ children }) {
    const [availableDates, setAvailableDates] = useState([]);
    const [selectedDate, setSelectedDate] = useState(''); // '' = latest

    useEffect(() => {
        import('../services/api').then(({ getAvailableDates }) => {
            getAvailableDates()
                .then(r => {
                    const dates = r.dates || [];
                    setAvailableDates(dates);
                    // Default to latest date
                    if (dates.length > 0 && !selectedDate) {
                        setSelectedDate(dates[0]); // dates[0] is the most recent
                    }
                })
                .catch(() => {});
        });
    }, []);

    return (
        <DateContext.Provider value={{ selectedDate, setSelectedDate, availableDates }}>
            {children}
        </DateContext.Provider>
    );
}

export function useDate() {
    const ctx = useContext(DateContext);
    if (!ctx) throw new Error('useDate must be used inside DateProvider');
    return ctx;
}
