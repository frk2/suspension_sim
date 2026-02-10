## Motorcycle suspension simulator.

This is a suspension simulator for the rear suspension of a motorcycle. We need to use mechanical engineering knowledge to simulate how a single pivot monoshock linkless suspension works. This would be a webapp designed in threejs.

## Geometry and construction
There are four main parts:
- Swingarm which is attached to swing arm pivot on left and wheel axle to the right
- Swing arm pivot and upper shock pivot whcih is fixed and attached to the frame. The frame is static. Only the swingarm moves.
- Lower shock mount
- Coilover shockabsorber.

## Inputs
The app would use the following inputs:

- Swingarm length. Default 550mm
- Lower swingarm pivot location (distance from pivot). Default 250mm
- Upper Swingarm pivot location (x,y from pivot). Default (160, 240)
- Shock length (default 280mm)
- Shock Stroke (default 55mm)
- Spring rate (default 600lbs/inch)
- Load on rear axle (default 200lbs)
- Preload on spring (default 0mm)

## Engineering references:
Study these to understand how a suspension works:
- https://en.wikipedia.org/wiki/Motion_ratio
- https://en.wikipedia.org/wiki/Hooke%27s_law
- https://en.wikipedia.org/wiki/Moment_(physics)

## Outputs
- Instantaneous Motion Ratio, calculated using axle travel vs shock travel with small delta
- Sag calculation where sag is defined as the difference in vertical axle travel from the fully extended (full stroke) of the shock to the equilibirum point. Sag has to be computed by doing a rough integral over tiny swingarm movements to compute delta stroke and calculate spring force. When the spring force equals load based on the moment arm of the swingarm lever its equilibrium.
- Instananeous spring force calculation
- Wheel rate.

## Controls
- Should be able to drag the wheel up and down to see the range of motion, motion ratio and spring force. This should set the system in 'free' mode where you are able to freely move the wheel up and down through its range of motion.
- A button called 'force' mode where you lose control and the physics calculation is used to set the wheel at its equilibrium location.

## Testing
- Use playwright and screenshots to confirm the UI looks correct.
- Add function tests to pass sanity checks on the physics of the system. These include:
    1. Motion ratio is calculated based on travel / stroke (wheel travel / shock travel). MR would be lowest when shock is perpendicular to the swingarm.
    2. Motion ratio strictly decreases as the shock / swingarm angle approaches 90 degrees, then starts to increase. Test with 5 different values of swingarm position to validate this.
    3. Increasing the spring rate strictly reduces sag with constant load
    4. Increasing the load increases sag with constant spring rate.
