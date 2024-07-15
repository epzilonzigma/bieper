import { VStack, Text, HStack, Box, Button, Input } from '@chakra-ui/react';
import React, { useState, useEffect } from 'react';

const getRandomInteger = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const Timer = () => {
    const beepSound = new Audio('/beep.mp3');

    const [isRunning, setIsRunning] = useState(false);

    const [timeRemaining, setTimeRemaining] = useState(0);
    const [previousTimeRemaining, setPreviousTimeRemaining] = useState(timeRemaining);
    const [minutesRemaining, setMinutesRemaining] = useState(Math.floor(timeRemaining / 60));
    const [secondsRemaining, setSecondsRemaining] = useState(timeRemaining % 60);

    const [minBeepInterval, setMinBeepInterval] = useState(0);
    const [maxBeepInterval, setMaxBeepInterval] = useState(0);

    let randomInterval = getRandomInteger(minBeepInterval, maxBeepInterval);
    let timeRemain = timeRemaining;

    useEffect(() => {
        if (isRunning && timeRemain > 0) {
            const countdown = setInterval(() => {
                timeRemain--;
                randomInterval--;
                setTimeRemaining(timeRemain);
                setMinutesRemaining(Math.floor(timeRemain / 60));
                setSecondsRemaining(timeRemain % 60);

                if (
                    randomInterval === 0 ||
                    (minBeepInterval === maxBeepInterval && Math.min(minBeepInterval, maxBeepInterval) === 0)
                ) {
                    beepSound.play();
                    randomInterval = getRandomInteger(minBeepInterval, maxBeepInterval);
                }

                if (timeRemain <= 0) {
                    clearInterval(countdown);
                    setIsRunning(false);
                }
            }, 1000);

            return () => clearInterval(countdown);
        }
    }, [isRunning]);

    const handleStartPause = () => {
        if (
            minBeepInterval > maxBeepInterval ||
            minBeepInterval > timeRemaining ||
            maxBeepInterval > timeRemaining ||
            Math.max(maxBeepInterval, minBeepInterval) < 0 ||
            timeRemaining === 0
        ) {
            return;
        }

        if (!isRunning) {
            setPreviousTimeRemaining(timeRemaining);
        }

        setIsRunning(!isRunning);
    };

    const handleReset = () => {
        setIsRunning(false);
        setTimeRemaining(previousTimeRemaining);
        setMinutesRemaining(Math.floor(previousTimeRemaining / 60));
        setSecondsRemaining(previousTimeRemaining % 60);
    };

    const handleEnterSeconds = (e) => {
        if (isRunning) {
            return;
        } else {
            setSecondsRemaining(Number(e.target.value));
            setTimeRemaining(Number(e.target.value) + minutesRemaining * 60);
        }
    };

    const handleEnterMinutes = (e) => {
        if (isRunning) {
            return;
        } else {
            setMinutesRemaining(Number(e.target.value));
            setTimeRemaining(Number(e.target.value) * 60 + secondsRemaining);
        }
    };

    return (
        <VStack backgroundColor="#011C2C" padding="10px" borderRadius="5px">
            <HStack>
                <Text fontSize="3xl" color="white" fontWeight="bold">
                    Bieper Timer
                </Text>
            </HStack>
            <HStack fontSize="5xl" color="white" textAlign="center" justifyContent="space-evenly">
                <Box width="100px" textAlign="center">
                    <Input
                        variant="unstyled"
                        onChange={handleEnterMinutes}
                        textAlign="center"
                        fontSize="5xl"
                        value={minutesRemaining}
                    />
                    <Text fontSize="xl">Minutes</Text>
                </Box>
                <Box width="100px" alignContent="center">
                    <Input
                        variant="unstyled"
                        onChange={handleEnterSeconds}
                        textAlign="center"
                        fontSize="5xl"
                        value={secondsRemaining}
                    />
                    <Text fontSize="xl">Seconds</Text>
                </Box>
            </HStack>
            <HStack margin="10px 0">
                <Button
                    size="lg"
                    width="120px"
                    backgroundColor={isRunning ? '#FD6259' : '#03AE85'}
                    color="white"
                    onClick={handleStartPause}
                >
                    {isRunning ? 'Pause' : 'Start'}
                </Button>
                <Button size="lg" width="120px" onClick={handleReset}>
                    Reset
                </Button>
            </HStack>
            <VStack border="1px white solid" padding="5px" borderRadius="5px" color="white">
                <Text fontWeight="bold">Beep Interval</Text>
                <HStack color="white" justifyContent="space-around">
                    <Text width="25%" textAlign="center">
                        Minimum
                    </Text>
                    <Input
                        placeholder="in seconds"
                        width="75%"
                        onChange={(e) => setMinBeepInterval(Number(e.target.value))}
                    />
                </HStack>
                <HStack color="white" justifyContent="space-around">
                    <Text width="25%" textAlign="center">
                        Maximum
                    </Text>
                    <Input
                        placeholder="in seconds"
                        width="75%"
                        onChange={(e) => setMaxBeepInterval(Number(e.target.value))}
                    />
                </HStack>
            </VStack>
        </VStack>
    );
};
