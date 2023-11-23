
import { useUserReferralInfo, useUserReferralCode } from "../src/gmx/domain/referrals/hooks"

describe("Referrals", () => {
    it("referrals test", async () => {
        const res = await useUserReferralInfo(undefined, 42161, "0x23b27875ad09d21517101a7f83499c38f7ec2d2a");
        console.log("referrals", res)
        expect(res).not.toBeNull()
    }, 120000);

    it("referrals code ", async () => {
        const res = await useUserReferralCode(undefined, 42161, "0x23b27875ad09d21517101a7f83499c38f7ec2d2a");
        console.log("referrals code", res)
        expect(res).not.toBeNull()
    }, 120000);
})
