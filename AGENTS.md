# Architecture rules
- Customer records are unique by restaurant and normalized E.164 phone; order triggers link all origins without overwriting established customer data.
- CRM purchase metrics derive only from completed orders with settled or not-required payment, never from cached counters.
- Customer recovery requires a verified phone claim; public checkout must never look up personal data by a phone alone.