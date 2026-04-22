import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function Explore() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(createPageUrl('Home'), { replace: true });
  }, []);
  return null;
}