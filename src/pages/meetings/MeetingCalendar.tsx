import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { meetingService } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarEvent {
    id: number;
    title: string;
    date: string;
    start_time: string;
    end_time: string;
    meeting_type?: {
        title: string;
        color: string;
    };
}

export default function MeetingCalendar() {
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const startDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    useEffect(() => {
        fetchEvents();
    }, [currentDate]);

    const fetchEvents = async () => {
        setIsLoading(true);
        try {
            // API expects parameters for month/year filtering ideally, 
            // but if the endpoint returns all future meetings or filtered by current context, we use it directly.
            // Based on API review: GET /meetings-calendar
            const response = await meetingService.getCalendar(); // Assuming this supports query params or filtering backend side
            // Ideally: meetingService.getCalendar({ month: currentDate.getMonth() + 1, year: currentDate.getFullYear() })

            if (response.data.success) {
                setEvents(response.data.data);
            } else if (Array.isArray(response.data)) {
                setEvents(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch calendar events:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    const renderCalendarDays = () => {
        const totalDays = daysInMonth(currentDate);
        const startDay = startDayOfMonth(currentDate);
        const days = [];

        // Empty cells for previous month
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-32 border border-gray-100 bg-gray-50/30"></div>);
        }

        // Days of current month
        for (let day = 1; day <= totalDays; day++) {
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.date === dateStr);
            const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

            days.push(
                <div key={day} className={`h-32 border border-gray-100 p-2 relative group overflow-hidden hover:bg-gray-50 transition-colors ${isToday ? 'bg-blue-50/50' : ''}`}>
                    <div className={`flex justify-between items-center mb-1`}>
                        <span className={`text-sm font-medium h-6 w-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>
                            {day}
                        </span>
                        {dayEvents.length > 0 && <span className="text-xs text-gray-400 hidden group-hover:block">{dayEvents.length} meetings</span>}
                    </div>
                    <div className="space-y-1 overflow-y-auto max-h-[88px] no-scrollbar">
                        {dayEvents.map(event => (
                            <div
                                key={event.id}
                                onClick={() => navigate(`/meetings/${event.id}`)}
                                className="text-xs p-1.5 rounded cursor-pointer truncate shadow-sm hover:opacity-80 transition-opacity"
                                style={{
                                    backgroundColor: event.meeting_type?.color ? `${event.meeting_type.color}20` : '#e2e8f0', // 20 hex opacity
                                    color: event.meeting_type?.color || '#475569',
                                    borderLeft: `3px solid ${event.meeting_type?.color || '#cbd5e1'}`
                                }}
                                title={`${event.start_time} - ${event.title}`}
                            >
                                <span className="font-semibold block sm:inline mr-1">{event.start_time.substring(0, 5)}</span>
                                {event.title}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return days;
    };

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-solarized-base02 flex items-center gap-2">
                        <CalendarIcon className="h-6 w-6" /> Meeting Calendar
                    </h1>
                    <p className="text-solarized-base01">Overview of all scheduled company meetings</p>
                </div>
                <div className="flex items-center gap-2 bg-white rounded-lg p-1 border shadow-sm">
                    <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="min-w-[140px] text-center font-medium text-lg">
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <div className="w-px h-6 bg-gray-200 mx-1"></div>
                    <Button variant="ghost" size="sm" onClick={handleToday}>Today</Button>
                </div>
            </div>

            <Card className="shadow-none">
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="h-[600px] flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-solarized-blue" />
                        </div>
                    ) : (
                        <>
                            {/* Weekday Headers */}
                            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <div key={day} className="py-2 text-center text-sm font-semibold text-gray-500 uppercase tracking-wider">
                                        {day}
                                    </div>
                                ))}
                            </div>
                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 bg-white">
                                {renderCalendarDays()}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <div className="flex gap-4 items-center text-sm text-gray-500 justify-end">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-100 border border-blue-400"></div>
                    <span>Scheduled</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-100 border border-green-400"></div>
                    <span>Internal</span>
                </div>
                {/* Add legend items dynamically if needed based on types present */}
            </div>
        </div>
    );
}
