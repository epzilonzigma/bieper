import React from 'react';
import { VStack } from '@chakra-ui/react';
import { Timer } from './components/Timer';

const App = () => {
    return (
        <>
            <VStack backgroundColor="black" height="100vh" justifyContent="center">
                <Timer />
            </VStack>
        </>
    );
};

export default App;
