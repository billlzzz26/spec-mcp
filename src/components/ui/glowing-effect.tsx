"use client";

/**
 * GlowingEffect Component
 * 
 * คอมโพเนนต์สำหรับสร้าง effect แสงเรืองรองรอบ ๆ card หรือ container
 * ใช้ mouse position tracking เพื่อทำให้แสงติดตามการเคลื่อนไหวของเมาส์
 * 
 * หลักการทำงาน:
 * 1. ติดตามตำแหน่ง pointer ผ่าน pointermove event
 * 2. คำนวณมุมระหว่าง pointer กับ center ของ element
 * 3. ใช้ conic-gradient หมุนตามมุมที่คำนวณได้
 * 4. animate ด้วย motion library เพื่อความ smooth
 */

import { memo, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { animate } from "motion/react";

interface GlowingEffectProps {
  /** ระดับ blur ของแสง (px) */
  blur?: number;
  /** โซนที่ไม่ active ตรงกลาง (0-1, เป็น ratio ของ element) */
  inactiveZone?: number;
  /** ระยะห่างจาก element ที่ยังคง active (px) */
  proximity?: number;
  /** องศาของการกระจายแสง */
  spread?: number;
  /** รูปแบบสี: default = หลากสี, white = ขาวล้วน */
  variant?: "default" | "white";
  /** เปิดใช้ glow แบบคงที่ */
  glow?: boolean;
  className?: string;
  /** ปิดการ tracking (แสดงเฉพาะ border ธรรมดา) */
  disabled?: boolean;
  /** ระยะเวลาการเคลื่อนที่ของ animation (วินาที) */
  movementDuration?: number;
  /** ความหนาของ border (px) */
  borderWidth?: number;
}

const GlowingEffect = memo(
  ({
    blur = 0,
    inactiveZone = 0.7,
    proximity = 0,
    spread = 20,
    variant = "default",
    glow = false,
    className,
    movementDuration = 2,
    borderWidth = 1,
    disabled = true,
  }: GlowingEffectProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const lastPosition = useRef({ x: 0, y: 0 });
    const animationFrameRef = useRef<number>(0);

    /**
     * handleMove - จัดการการเคลื่อนไหวของ pointer
     * 
     * ขั้นตอนการทำงาน:
     * 1. คำนวณตำแหน่ง center ของ element
     * 2. ตรวจสอบว่า pointer อยู่ใน inactive zone หรือไม่
     * 3. ตรวจสอบว่า pointer อยู่ในระยะ proximity หรือไม่
     * 4. คำนวณมุมและ animate ไปยังมุมใหม่
     */
    const handleMove = useCallback(
      (e?: MouseEvent | { x: number; y: number }) => {
        if (!containerRef.current) return;

        // ใช้ requestAnimationFrame เพื่อ optimize performance
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        animationFrameRef.current = requestAnimationFrame(() => {
          const element = containerRef.current;
          if (!element) return;

          const { left, top, width, height } = element.getBoundingClientRect();
          const mouseX = e?.x ?? lastPosition.current.x;
          const mouseY = e?.y ?? lastPosition.current.y;

          if (e) {
            lastPosition.current = { x: mouseX, y: mouseY };
          }

          // คำนวณ center point
          const center = [left + width * 0.5, top + height * 0.5];
          const distanceFromCenter = Math.hypot(
            mouseX - center[0],
            mouseY - center[1]
          );
          const inactiveRadius = 0.5 * Math.min(width, height) * inactiveZone;

          // ถ้า pointer อยู่ใน inactive zone ให้ปิด effect
          if (distanceFromCenter < inactiveRadius) {
            element.style.setProperty("--active", "0");
            return;
          }

          // ตรวจสอบว่า pointer อยู่ในระยะ proximity หรือไม่
          const isActive =
            mouseX > left - proximity &&
            mouseX < left + width + proximity &&
            mouseY > top - proximity &&
            mouseY < top + height + proximity;

          element.style.setProperty("--active", isActive ? "1" : "0");

          if (!isActive) return;

          // คำนวณมุมจาก center ไปยัง pointer
          // ใช้ atan2 เพื่อได้มุมในหน่วย radian แล้วแปลงเป็น degree
          const currentAngle =
            parseFloat(element.style.getPropertyValue("--start")) || 0;
          let targetAngle =
            (180 * Math.atan2(mouseY - center[1], mouseX - center[0])) /
              Math.PI +
            90;

          // คำนวณ shortest path สำหรับ angle interpolation
          const angleDiff = ((targetAngle - currentAngle + 540) % 360) - 180;
          const newAngle = currentAngle + angleDiff;

          // Animate ไปยังมุมใหม่ด้วย easing curve ที่ smooth
          animate(currentAngle, newAngle, {
            duration: movementDuration,
            ease: [0.16, 1, 0.3, 1],
            onUpdate: (value) => {
              element.style.setProperty("--start", String(value));
            },
          });
        });
      },
      [inactiveZone, proximity, movementDuration]
    );

    useEffect(() => {
      if (disabled) return;

      const handleScroll = () => handleMove();
      const handlePointerMove = (e: PointerEvent) => handleMove(e);

      window.addEventListener("scroll", handleScroll, { passive: true });
      document.body.addEventListener("pointermove", handlePointerMove, {
        passive: true,
      });

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        window.removeEventListener("scroll", handleScroll);
        document.body.removeEventListener("pointermove", handlePointerMove);
      };
    }, [handleMove, disabled]);

    return (
      <>
        {/* Static border - แสดงเมื่อ disabled */}
        <div
          className={cn(
            "pointer-events-none absolute -inset-px hidden rounded-[inherit] border opacity-0 transition-opacity",
            glow && "opacity-100",
            variant === "white" && "border-white",
            disabled && "!block"
          )}
        />
        {/* Animated glow container */}
        <div
          ref={containerRef}
          style={
            {
              "--blur": `${blur}px`,
              "--spread": spread,
              "--start": "0",
              "--active": "0",
              "--glowingeffect-border-width": `${borderWidth}px`,
              "--repeating-conic-gradient-times": "5",
              "--gradient":
                variant === "white"
                  ? `repeating-conic-gradient(
                  from 236.84deg at 50% 50%,
                  var(--black),
                  var(--black) calc(25% / var(--repeating-conic-gradient-times))
                )`
                  : `radial-gradient(circle, #dd7bbb 10%, #dd7bbb00 20%),
                radial-gradient(circle at 40% 40%, #d79f1e 5%, #d79f1e00 15%),
                radial-gradient(circle at 60% 60%, #5a922c 10%, #5a922c00 20%), 
                radial-gradient(circle at 40% 60%, #4c7894 10%, #4c789400 20%),
                repeating-conic-gradient(
                  from 236.84deg at 50% 50%,
                  #dd7bbb 0%,
                  #d79f1e calc(25% / var(--repeating-conic-gradient-times)),
                  #5a922c calc(50% / var(--repeating-conic-gradient-times)), 
                  #4c7894 calc(75% / var(--repeating-conic-gradient-times)),
                  #dd7bbb calc(100% / var(--repeating-conic-gradient-times))
                )`,
            } as React.CSSProperties
          }
          className={cn(
            "pointer-events-none absolute inset-0 rounded-[inherit] opacity-100 transition-opacity",
            glow && "opacity-100",
            blur > 0 && "blur-[var(--blur)] ",
            className,
            disabled && "!hidden"
          )}
        >
          {/* Inner glow element with mask */}
          <div
            className={cn(
              "glow",
              "rounded-[inherit]",
              'after:content-[""] after:rounded-[inherit] after:absolute after:inset-[calc(-1*var(--glowingeffect-border-width))]',
              "after:[border:var(--glowingeffect-border-width)_solid_transparent]",
              "after:[background:var(--gradient)] after:[background-attachment:fixed]",
              "after:opacity-[var(--active)] after:transition-opacity after:duration-300",
              "after:[mask-clip:padding-box,border-box]",
              "after:[mask-composite:intersect]",
              "after:[mask-image:linear-gradient(#0000,#0000),conic-gradient(from_calc((var(--start)-var(--spread))*1deg),#00000000_0deg,#fff,#00000000_calc(var(--spread)*2deg))]"
            )}
          />
        </div>
      </>
    );
  }
);

GlowingEffect.displayName = "GlowingEffect";

export { GlowingEffect };
