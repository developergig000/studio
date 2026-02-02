# **App Name**: SalesForceLite

## Core Features:

- Email/Password Authentication: Allow users to log in using their email and password via Firebase Authentication.
- Firestore User Profiles: Store user data (name, email, role, createdAt) in a Firestore `users/{uid}` collection.
- Initial User Seeding: Implement a Cloud Function to seed 5 initial user accounts with specific roles and custom claims, triggered via an HTTPS callable function `seedInitialUsers()`.
- Role-Based Access Control: Enforce Firestore rules to control data access based on user roles (SALES, HEAD_SALES), limiting read access and preventing unauthorized deletion of users.
- Login Page: A simple login page where the users enter the email address and password.
- Seed Execution Page: A page to execute the cloud function responsible for creating initial users. Display execution status on the UI.
- Role-Based Dashboards: Route users to different dashboards (/dashboard/head for HEAD_SALES, /dashboard/sales for SALES) after login, with route guards to ensure access is restricted based on authentication and role.  The AI tool decides where to route the user.

## Style Guidelines:

- Primary color: Deep Indigo (#3F51B5) to convey trust and professionalism, fitting for a business application. In HSL: (227, 50%, 48%).
- Background color: Very light Indigo (#E8EAF6), a desaturated version of the primary to create a clean and calm backdrop. In HSL: (227, 20%, 93%).
- Accent color: Deep Violet (#673AB7), an analogous hue to Indigo, offering contrast and highlighting key interactive elements. In HSL: (262, 49%, 47%).
- Headline font: 'Space Grotesk', a sans-serif with a techy, scientific feel; Body font: 'Inter', a grotesque-style sans-serif with a neutral look. The two form a suitable pairing.
- Use simple, consistent icons from a library like Material Icons to represent user roles and actions within the dashboards.
- Employ a clean and responsive layout with clear separation of concerns in each dashboard, ensuring usability across different devices.
- Subtle transitions and animations on dashboard elements to enhance user experience, without being distracting.