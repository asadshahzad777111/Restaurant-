# Guest POS + reviews

1. Guest opens `/order?tenant=CODE` (optional `table` / `mode`).
2. Add/remove shows toast; clear cart confirms; mode switch with cart confirms.
3. Place order → redirect `/track/[token]`.
4. Staff advances status on Orders/Kitchen; **Completed** unlocks review.
5. One review per `trackToken` after `status=completed`.
