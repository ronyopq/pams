# UI Wireframes (Implementation Blueprint)

## App Shell
```text
+--------------------------------------------------------------+
| Sidebar                       | Top Bar (date/user/alerts)  |
| - Dashboard                   +------------------------------+
| - Daily Activity              | Sticky Reminder Bar          |
| - Work Plan                   +------------------------------+
| - Calendar                    | Main Content                 |
| - Reports                     | (cards/tables/calendar/etc.) |
| - Files                       |                              |
| - Settings                    |                              |
+--------------------------------------------------------------+
```

## Dashboard
```text
[Today Activities] [Today Work Plan] [Pending Followups] [Hours Today]
[Monthly Hours Bar Chart] [Category Pie Chart]
[Today Plan Timeline + popup]
```

## Daily Activity
```text
[Activity Form with time tracking + workplan link]
[Attachment Upload panel]
[Create Followup panel]
[Activity Timeline list]
```

## Work Plan
```text
[Create Plan Form]
[Import/Export Controls]
[Editable Table: date/activity/output/priority/status/actions]
```

## Calendar
```text
[Month selector + color legend]
[FullCalendar Month/Week/Day]
Blue=Activities, Green=Work Plans, Red=Followups
```

## Reports
```text
[Month selector]
[Summary cards]
[Completed tasks panel]
[Ongoing tasks panel]
[Category breakdown]
[Export buttons: PDF | Word | Excel]
```

## Files
```text
[Attachment list]
[Preview panel (image/pdf inline)]
[Secure download for doc/xlsx]
```
