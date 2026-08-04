from datetime import date, timedelta

class LeaveCalculator:
    @staticmethod
    def calculate_working_days(start_date: date, end_date: date, half_day: bool = False) -> float:
        """
        Calculates the number of working days between two dates, excluding weekends.
        For MVP, public holidays are not tracked in the database, so we only exclude Saturdays and Sundays.
        """
        if start_date > end_date:
            return 0.0
            
        if half_day and start_date == end_date:
            # If it's a half day and start == end, and it's a weekday, it's 0.5
            if start_date.weekday() < 5:
                return 0.5
            return 0.0
            
        working_days = 0.0
        current_date = start_date
        
        while current_date <= end_date:
            if current_date.weekday() < 5: # Monday to Friday are 0-4
                working_days += 1.0
            current_date += timedelta(days=1)
            
        return working_days
