# Login Function

- There will be 3 user types
   - Admin: full access to all functionalities
   - Kitchen Staff: access only to KDS functions
   - Waiter Staff: access only to waiter functions
- Admin account will be setup since data seeding
- Admin can manage users as well including setting password (min 6 and no other restrictions for now)
- Login will require username and password

# Event master data

- Admin setup event master data as the following 

`
{
   "id": 1,
   "name": "Connect Monthly Charity 2025 09",
   "description": "",
   "eventDate": "2025-09-14"
}`

# Menu Item creation

- Only Admin can manage menu items
- select the Event and provide menu item values 
- submit the menu item
- The system will keep all the menut items adding in every month unless user delete them (soft delete)

 Menu Item data
 
 `
   {
      "name": "Pumpkin Spice Risotto",
      "price": 1800,
      "category": "Main",
      "requiresPrep": true,
      "eventId": 1
   }
 `

 # Improvements
 - Waiter should be able to add remarks for each order menu item for customer preference
 - The new order should hv an input for Waiter to enter the customer(s) name if they want
 - make the database table changes if needed to meet the Remarks requirements


# Authentication Improvements
- if not authorized and token failed, logout automatically and show login page

# Improvements
- the items added to the new order should show individual item with Remarks input to be able to add the respective Remark for each item (even for same item order)
   - current UI still not fulfill the requirements as it's is still just adding the Qty to the same item if same items are in the new order.
- The customer (optional) should show separately as the item details content instead of Title contnet, just above the menu item name with qty, in KDS page
- the updated timestamp display has the issues as the followings:
  - 4hr 5m agom ago
  - Sep 6, 2025, 01:13 AMm ago

  # Improvements
  - Show as current active event in New Order form when:
   - there is only one Event created for current month OR
   - there are more than one Event created for current month and today date is closer or equal to the event date
  
  - Keep as past events if the event date is past the today date. (Will add Past Events page later)

  # Improvements
  - Modify capturing the timestamp of order status changed as the following:
   - PreparingStartedAt: when kitchen staff changed from New to In Progress
   - ReadyAt: when kitchen staff changed from In Progress to Ready
   - CollectedAt: when waiter staff changed from Ready to Collected
  - Show respective timestamp in each status Card
 
 # Improvements
 - Change order status name from "Completed" as Collected
 - Show "Mark as Collected" button in Waiter Staff's Orders list page in respective order
 - The timestamp showing are not correct client Timezone and fix it

 # Bugs
 - Fix to show the timestamp in Kitchen display correctly
   - Status: New
      - CreatedAt timestamp
   - Status: In Progress
      - PreparingStartedAt timestamp
   - Status: Ready
      - ReadyAt timestamp
   - Status: Collected
      - CollectedAt timestamp
- Hide "Mark as Collected" button in Kitchen Staff's Orders list page. It should be in Waiter Staff's Orders list page when the status is Ready

  Remove "Time" column from All Orders page table and move respective status timestamp to Status column and show below the Status value like "At 12:30 AM"


  # All Orders page
  - Override the existing messed up UI with the following requirements
  - Show all active orders from current event in Responsive Table format
     - Columns are as the followings:
      - Table: table number from order
      - Customer: customer name (if there is value)
      - Item: all order items with remarks
      - Ordered At: order created at timestamp 
      - Status: order status
      - Action: Mark as Collected button if status is Ready
  - Mobile responsive layout
   - Use Cards/Stacked layout for all column values
  - Show Collected status orders at the bottom

# Pre-Order
- improve the New Order function to accept the Pre Order also
   - add an option to mark as Pre-Order
   - save the pre-order option value to database
- Show pre-order indicator in the All Orders table's first column - Table using a circle icon with text "Pre" and relevant icon color


# Orders entity improvement
- add the isActive flags to Orders entity
- set true to isActive as Default
- set false when record is deleted and exclude in orders retrieving

# New Order page management
- apply the same styling of Customer Name to the Remarks input of selected item in New Order
- show the price of each item between the item and remarks input
- calculate total amount of order by suming all item prices and show it beside the Table number input by making Table number input a bit smaller

# Order Number improvement
- change TableNumber to OrderNumber 
- add LastOrderCount column to Orders entity
- set new OrderNumber using the format CN[YYYYMM]001, CN[YYYYMM]002 in New Order page by getting the LastOrderCount and plus 1
- add the new order record together with the LastOrderCount value

- Show Order Number in New Order page below Active Event
- Show Total Amount above the Submit Order button

- Improve frontend to configure server endpoints to remove hard-coded endpoints