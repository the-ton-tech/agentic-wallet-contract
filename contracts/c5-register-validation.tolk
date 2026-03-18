// The wallet contract is low-level.
// It operates with TVM register c5 (out actions) and validates actions before pushing there.

import "errors"

/// "OutActionList" is what gets pushed to c5.
/// see block.tlb: https://github.com/ton-blockchain/ton/blob/5c392e0f2d946877bb79a09ed35068f7b0bd333a/crypto/block/block.tlb#L378
type OutActionsCell = cell

/// This list contains only "send message" actions (the only type we allow).
/// see block.tlb: https://github.com/ton-blockchain/ton/blob/5c392e0f2d946877bb79a09ed35068f7b0bd333a/crypto/block/block.tlb#L380
struct (0x0ec3c86d) OutActionWithSendMessageOnly {
    prev: OutActionsCell
    sendMode: uint8
    outMsg: cell
}

/// Put a raw OutActionList into register c5.
fun setTvmRegisterC5(actionList: cell): void
    asm "c5 POP"

/// Transform an ordinary or exotic cell into a slice as if it were ordinary.
fun OutActionsCell.beginParseAllowExotic(self): slice
    asm "XCTOS" "DROP"

/// Verify that an OutActionList contains only allowed "send message" actions.
fun OutActionsCell.verifyC5Actions(self, isExternal: bool): self {
    var count = 0;

    var cs = self.beginParseAllowExotic();
    do {
        // These checks could be cheaper in gas if we tried parsing directly,
        // but we want to throw exactly ERROR_INVALID_C5 (not 9 cell underflow).
        var (nBits, nRefs) = cs.remainingBitsAndRefsCount();
        assert (nRefs == 2) throw ERROR_INVALID_C5;
        assert (nBits == 32 + 8) throw ERROR_INVALID_C5;

        val outAction = lazy OutActionWithSendMessageOnly.fromSlice(cs, {
            throwIfOpcodeDoesNotMatch: ERROR_INVALID_C5
        });

        if (isExternal) {
            assert (outAction.sendMode & SEND_MODE_IGNORE_ERRORS) throw ERROR_EXTERNAL_SEND_MESSAGE_MUST_HAVE_IGNORE_ERRORS_SEND_MODE;
        }

        cs = outAction.prev.beginParseAllowExotic();
        count += 1;
    } while (!cs.isEmpty());

    assert (count <= 255) throw ERROR_INVALID_C5;
    return self;
}
