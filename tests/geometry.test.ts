import { actionForCoal, seatingGeometry } from "../src/lib/geometry.ts";
import { cartridge } from "./helpers.ts";

describe("actionForCoal", () => {
  it("picks the smallest action that holds the cartridge", () => {
    expect(actionForCoal(2.26).id).toBe("ar15");
    expect(actionForCoal(2.81).id).toBe("short");
    expect(actionForCoal(3.34).id).toBe("long");
    expect(actionForCoal(3.6).id).toBe("magnum");
    expect(actionForCoal(4.0).id).toBe("oversize");
  });
});

describe("seatingGeometry", () => {
  const cm = cartridge("6-5-creedmoor"); // case 1.920, SAAMI COAL 2.825, 53.4 gr H2O, neck length not in library
  const bullet = { diameterIn: 0.264, lengthIn: 1.4, bearingSurfaceIn: 0.55, boattailLengthIn: 0.2 };

  it("seats a long bullet deeper to fit SAAMI COAL and shows the working", () => {
    const g = seatingGeometry({ cartridge: cm, bullet });
    expect(g.status).toBe("fits_seated_deeper");
    expect(g.controlling).toBe("saami_max_coal");
    // Ideal = 1.920 - 0.264 (assumed neck) + 1.400
    expect(g.idealCoalIn).toBeCloseTo(3.056, 3);
    expect(g.recommendedCoalIn).toBe(2.825);
    expect(g.seatingDepthIn).toBeCloseTo(0.495, 3);
    // Below-neck intrusion: (0.495 - 0.264) × π/4 × 0.264² × 252.9 gr/in³
    expect(g.capacityLossGrH2O).toBeCloseTo(0.231 * (Math.PI / 4) * 0.264 ** 2 * 252.9, 2);
    expect(g.flags).toContain("neck_length_assumed");
    expect(g.steps.map((s) => s.label)).toEqual(
      expect.arrayContaining(["Ideal COAL", "SAAMI max COAL", "Magazine length", "Minimum seating depth", "Maximum seating depth", "Result"]),
    );
  });

  it("works out the depth window from capacity and bearing surface", () => {
    const g = seatingGeometry({ cartridge: cm, bullet });
    expect(g.minSeatingDepthIn).toBeCloseTo(0.2 + 0.264, 3);
    // 10% of the 6.5 Creedmoor capacity below the neck, plus the neck.
    expect(g.maxSeatingDepthIn).toBeCloseTo(0.264 + (0.1 * cm.caseCapacityGrH2O!) / 252.9 / ((Math.PI / 4) * 0.264 ** 2), 3);
  });

  it("flags a custom chamber and computes freebore when the bullet cannot be seated short enough", () => {
    const g = seatingGeometry({ cartridge: cm, bullet: { ...bullet, lengthIn: 1.7, bearingSurfaceIn: 0.8 } });
    expect(g.status).toBe("needs_custom_chamber");
    expect(g.controlling).toBe("seating_depth");
    const required = 1.92 + 1.7 - g.maxSeatingDepthIn!;
    expect(g.recommendedCoalIn).toBeCloseTo(required, 3);
    expect(g.freeboreLengtheningIn).toBeCloseTo(required - 2.825, 3);
    expect(g.requiredAction!.id).toBe("long");
    expect(g.flags).toEqual(expect.arrayContaining(["custom_chamber_required", "magazine_too_short"]));
  });

  it("uses the ideal COAL when it fits", () => {
    const g = seatingGeometry({ cartridge: cartridge("308-win"), bullet: { diameterIn: 0.308, lengthIn: 0.9, boattailLengthIn: null, bearingSurfaceIn: null } });
    expect(g.status).toBe("fits");
    expect(g.controlling).toBe("ideal");
    expect(g.recommendedCoalIn).toBeCloseTo(2.015 - 0.308 + 0.9, 3);
    expect(g.requiredAction!.id).toBe("short");
    expect(g.flags).toContain("bearing_surface_unknown");
  });

  it("lets a short magazine control instead of SAAMI", () => {
    const g = seatingGeometry({ cartridge: cm, bullet, magazineLengthIn: 2.8 });
    expect(g.controlling).toBe("magazine");
    expect(g.recommendedCoalIn).toBe(2.8);
    expect(g.magazineSource).toBe("user");
  });

  it("uses a known neck length instead of assuming one", () => {
    const g = seatingGeometry({ cartridge: cartridge("223-rem"), bullet: { diameterIn: 0.224, lengthIn: 0.74 } });
    expect(g.flags).not.toContain("neck_length_assumed");
    expect(g.idealCoalIn).toBeCloseTo(1.76 - 0.203 + 0.74, 3);
  });

  it("says what is missing instead of guessing", () => {
    const g = seatingGeometry({ cartridge: cm, bullet: { ...bullet, lengthIn: 0 } });
    expect(g.status).toBe("insufficient_data");
    expect(g.steps[0]!.detail).toMatch(/no published length/);
  });

  it("notes that wildcats have no standard COAL", () => {
    const g = seatingGeometry({ cartridge: cartridge("6mm-dasher"), bullet: { diameterIn: 0.243, lengthIn: 1.3 }, magazineLengthIn: 2.85 });
    expect(g.flags).toContain("no_standard_coal");
    expect(g.freeboreLengtheningIn).toBeNull();
  });
});
