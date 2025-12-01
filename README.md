# GraphQL Profile Project

## Objective

This project is designed to help you learn the GraphQL query language by building a personal profile page. You will interact with the Zone01 platform's GraphQL endpoint:

```
https://learn.zone01oujda.ma/api/graphql-engine/v1/graphql
```

## Features

- **Login Page**: Secure authentication to access your personal data.
- **Profile Page**: Displays at least three user data sections (choose from):
  - Basic user identification
  - XP amount
  - Grades
  - Audits
  - Skills
- **Statistics Section**: Mandatory section with dynamic statistic graphs visualizing your data.

## Technologies Used

- **HTML, CSS, JavaScript**
- **GraphQL** for querying user data

## How It Works

1. **Login**: Enter your credentials to authenticate and receive a token.
2. **Fetch Data**: The app uses your token to query the GraphQL endpoint and retrieve your profile information.
3. **Display Profile**: Your profile page shows selected data sections and interactive graphs for statistics.

## Setup & Usage

1. Clone the repository:
   ```sh
   git clone https://github.com/AyyoubMh48/graphql48.git
   cd graphql48
   ```
2. Open `index.html` in your browser.
3. Enter your Zone01 credentials to view your profile and statistics.

## Customization

- You can choose which three data sections to display on your profile.
- The statistics graphs are generated dynamically based on your data.

## Example Data Displayed

- Username, full name
- XP amount
- Skills breakdown
- Audit ratio and performance
- Grades (optional)

## License

This project is for educational purposes.

---

**Enjoy learning GraphQL and visualizing your Zone01 profile!**
